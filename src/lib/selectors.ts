import { TODAY } from "@/lib/seed";
import type { HubState, NextAction, RunResult } from "@/lib/types";

export function droneById(state: HubState, id: string | null) {
  return state.drones.find((drone) => drone.id === id) ?? null;
}

export function buildById(state: HubState, id: string | null) {
  return state.builds.find((build) => build.id === id) ?? null;
}

export function caseById(state: HubState, id: string) {
  return state.testCases.find((testCase) => testCase.id === id) ?? null;
}

export function issueById(state: HubState, id: string) {
  return state.issues.find((issue) => issue.id === id) ?? null;
}

export function todayPlan(state: HubState) {
  return [...state.plan]
    .filter((item) => item.date === TODAY)
    .sort((a, b) => a.window.localeCompare(b.window));
}

export function todayRuns(state: HubState) {
  return [...state.runs]
    .filter((run) => run.startedAt.startsWith(TODAY))
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
  const drones = state.drones.filter((drone) => drone.family !== "Ground");
  return {
    planned: todayPlan(state).filter((item) => item.status === "Planned" || item.status === "In progress")
      .length,
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
  const inProgress = todayPlan(state).find((item) => item.status === "In progress");
  if (inProgress) {
    const testCase = caseById(state, inProgress.testCaseId);
    const drone = droneById(state, inProgress.droneId);
    actions.push({
      title: `Finish ${testCase?.code ?? "sortie"} on ${drone?.name}`,
      why: inProgress.notes,
      href: "/plan",
      priority: "now",
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

  const planned = todayPlan(state).filter((item) => item.status === "Planned");
  for (const item of planned.slice(0, 2)) {
    const testCase = caseById(state, item.testCaseId);
    const drone = droneById(state, item.droneId);
    actions.push({
      title: `${item.window} ${testCase?.code} ${testCase?.name}`,
      why: `${drone?.name}. ${item.notes}`,
      href: "/plan",
      priority: "next",
    });
  }

  return actions.slice(0, 6);
}

export function dailySummary(state: HubState) {
  const runs = todayRuns(state);
  const done = runs.filter((run) => run.result !== "Not run");
  const pass = done.filter((run) => run.result === "Pass" || run.result === "Pass with observations");
  const fail = done.filter((run) => run.result === "Fail" || run.result === "Aborted");
  const open = openIssues(state);
  const tomorrow = todayPlan(state).filter(
    (item) => item.status === "Planned" || item.status === "In progress"
  );
  const lines = [
    `${state.site}. Decision ${state.decision}. ${state.weather}`,
    `Completed ${done.length} of ${runs.length} recorded runs today (${pass.length} pass / observations, ${fail.length} fail / aborted).`,
    open.length
      ? `${open.length} unresolved issues. Ready for retest: ${open
          .filter((issue) => issue.status === "READY FOR RETEST")
          .map((issue) => issue.id)
          .join(", ") || "none"}.`
      : "No open issues.",
    tomorrow.length
      ? `Still on the card: ${tomorrow
          .map((item) => {
            const testCase = caseById(state, item.testCaseId);
            return `${item.window} ${testCase?.code}`;
          })
          .join(", ")}.`
      : "No remaining planned sorties.",
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
