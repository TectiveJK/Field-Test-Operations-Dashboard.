import { todayIso } from "@/lib/format";
import { isAirframe, type HubState, type NextAction, type PlanItem, type RunResult } from "@/lib/types";

export function droneById(state: HubState, id: string | null) {
  return state.drones.find((drone) => drone.id === id) ?? null;
}

export function buildById(state: HubState, id: string | null) {
  return state.builds.find((build) => build.id === id) ?? null;
}

export function caseById(state: HubState, id: string | null) {
  if (!id) return null;
  return state.testCases.find((testCase) => testCase.id === id) ?? null;
}

export function issueById(state: HubState, id: string) {
  return state.issues.find((issue) => issue.id === id) ?? null;
}

export function planLabel(item: PlanItem, state: HubState) {
  const testCase = caseById(state, item.testCaseId);
  if (testCase) return `${testCase.code} ${testCase.name}`;
  return item.title;
}

function byWhen(a: PlanItem, b: PlanItem) {
  return a.date.localeCompare(b.date) || a.window.localeCompare(b.window);
}

export function upcomingPlan(state: HubState) {
  const today = todayIso();
  return [...state.plan]
    .filter((item) => item.date >= today || (item.status !== "Done" && item.status !== "Skipped"))
    .sort(byWhen);
}

export function activePlan(state: HubState) {
  const today = todayIso();
  return [...state.plan].filter((item) => item.date >= today).sort(byWhen);
}

export function donePlanHistory(state: HubState) {
  const today = todayIso();
  return [...state.plan]
    .filter((item) => item.date < today && item.status === "Done")
    .sort((a, b) => byWhen(b, a));
}

export function skippedPlanCarryover(state: HubState) {
  const today = todayIso();
  return [...state.plan].filter((item) => item.date < today && item.status === "Skipped").sort(byWhen);
}

export function todayPlan(state: HubState) {
  const today = todayIso();
  return activePlan(state).filter((item) => item.date === today);
}

export function todayRuns(state: HubState) {
  const today = todayIso();
  return [...state.runs]
    .filter((run) => run.startedAt.startsWith(today))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function openIssues(state: HubState) {
  return state.issues.filter((issue) => issue.status !== "RESOLVED");
}

export function failedCases(state: HubState) {
  return state.runs.filter(
    (run) => run.result === "Fail" || run.result === "Aborted" || run.result === "Blocked"
  );
}

export function counts(state: HubState) {
  const drones = state.drones.filter(isAirframe);
  const remaining = upcomingPlan(state).filter(
    (item) => item.status === "Planned" || item.status === "In progress"
  );
  return {
    planned: remaining.length,
    available: drones.filter((drone) => drone.status === "Available").length,
    underTest: drones.filter((drone) => drone.status === "Under test").length,
    grounded: drones.filter((drone) => drone.status === "Grounded").length,
    open: openIssues(state).length,
    readyRetest: state.issues.filter((issue) => issue.status === "READY FOR RETEST").length,
    todayRuns: todayRuns(state).length,
    checklistLeft: state.checklist.filter((item) => !item.done).length,
  };
}

export function nextActions(state: HubState): NextAction[] {
  const actions: NextAction[] = [];
  const queue = upcomingPlan(state).filter(
    (item) => item.status === "In progress" || item.status === "Planned"
  );
  const inProgress = queue.find((item) => item.status === "In progress");
  if (inProgress) {
    const drone = droneById(state, inProgress.droneId);
    actions.push({
      title: `Finish ${planLabel(inProgress, state)}${drone ? ` on ${drone.name}` : ""}`,
      why: [inProgress.owner, inProgress.notes].filter(Boolean).join(". ") || `${inProgress.date} ${inProgress.window}`,
      href: "/plan",
      priority: "now",
      planId: inProgress.id,
    });
  }

  for (const issue of state.issues.filter((item) => item.status === "READY FOR RETEST")) {
    const drone = droneById(state, issue.droneId);
    const blocked = drone?.status === "Grounded";
    actions.push({
      title: `Retest ${issue.id}: ${issue.missionType}`,
      why: blocked
        ? `${drone?.name ?? "Airframe"} is grounded. ${issue.retestResult}`
        : issue.retestResult || issue.actual,
      href: "/issues",
      priority: blocked ? "blocked" : "next",
    });
  }

  for (const item of queue.filter((entry) => entry.status === "Planned").slice(0, 3)) {
    const drone = droneById(state, item.droneId);
    actions.push({
      title: `${item.date} ${item.window} ${planLabel(item, state)}`,
      why: [drone?.name, item.owner, item.notes].filter(Boolean).join(". ") || "From Upcoming flights & tests.",
      href: "/plan",
      priority: "next",
      planId: item.id,
    });
  }

  return actions.slice(0, 6);
}

export function questionThreePlan(state: HubState): PlanItem[] {
  const upcomingIds = new Set(upcomingPlan(state).map((item) => item.id));
  const items: PlanItem[] = [];
  const seen = new Set<string>();
  for (const item of [
    ...skippedPlanCarryover(state),
    ...nextActions(state)
      .map((action) => (action.planId ? state.plan.find((entry) => entry.id === action.planId) : null))
      .filter((item): item is PlanItem => Boolean(item)),
  ]) {
    if (upcomingIds.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

export function questionThreeIssues(state: HubState): NextAction[] {
  return nextActions(state).filter((action) => !action.planId);
}

export function dailySummary(state: HubState) {
  const runs = todayRuns(state);
  const done = runs.filter((run) => run.result !== "Not run");
  const pass = done.filter((run) => run.result === "Pass" || run.result === "Pass with observations");
  const fail = done.filter((run) => run.result === "Fail" || run.result === "Aborted");
  const open = openIssues(state);
  const remaining = upcomingPlan(state).filter(
    (item) => item.status === "Planned" || item.status === "In progress"
  );
  const missing = state.drones.filter((drone) => isAirframe(drone) && drone.status === "Grounded");
  const site = state.site || "Tective";
  const weather = state.weather ? ` ${state.weather}` : "";
  const lines = [
    `${site}. Decision ${state.decision}.${weather}`,
    done.length || runs.length
      ? `Completed ${done.length} of ${runs.length} recorded runs today (${pass.length} pass / observations, ${fail.length} fail / aborted).`
      : "No test runs recorded in this hub yet. Record them here, or keep using SIM Flight Testing and Drone Flight Test Reporter.",
    open.length
      ? `${open.length} unresolved issues. Ready for retest: ${open
          .filter((issue) => issue.status === "READY FOR RETEST")
          .map((issue) => issue.id)
          .join(", ") || "none"}.`
      : "No open issues in this hub. Maintenance Assistant has no stored fleet records.",
    remaining.length
      ? `Still on the card: ${remaining
          .map((item) => `${item.date} ${item.window} ${planLabel(item, state)}`)
          .join("; ")}.`
      : "No remaining planned flights or tests on the Upcoming board.",
    missing.length
      ? `Grounded from Hardware locator / status: ${missing
          .map((drone) => `${drone.name}${drone.location ? ` (${drone.location})` : ""}`)
          .join(", ")}.`
      : "No airframes marked grounded.",
  ];
  return lines.join(" ");
}

export function runsForCase(state: HubState, testCaseId: string) {
  return [...state.runs]
    .filter((run) => run.testCaseId === testCaseId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function concludedResult(results: RunResult[]): RunResult {
  const pending = results.filter((result) => result !== "Not run");
  if (pending.length === 0) return "Not run";
  if (pending.every((result) => result === "Pass")) return "Pass";
  if (pending.some((result) => result === "Fail" || result === "Aborted")) {
    if (pending.some((result) => result === "Pass" || result === "Pass with observations")) {
      return "Pass with observations";
    }
    return pending.includes("Fail") ? "Fail" : "Aborted";
  }
  if (pending.some((result) => result === "Pass with observations")) return "Pass with observations";
  if (pending.some((result) => result === "Blocked")) return "Blocked";
  return pending[0];
}

export function buildLine(state: HubState, buildId: string | null) {
  const build = buildById(state, buildId);
  if (!build) return "";
  return [build.label, build.jenkins && `Jenkins ${build.jenkins}`, build.gcs, build.skyCommand]
    .filter(Boolean)
    .join(" · ");
}
