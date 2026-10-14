import { SUITE } from "@/lib/sim-suite";
import type { HubState, Issue, RunResult, TestRun } from "@/lib/types";

export const SIM_STORE_KEY = "sim-flight-testing-store-v1";

type SimStatus = "passed" | "failed" | "blocked" | "not_tested" | "not_applicable";

type SimRun = {
  id: string;
  number?: number;
  name: string;
  skyCommandVersion?: string;
  droneVersion?: string;
  tester?: string;
  startedAt: string;
  notes?: string;
};

type SimResult = {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: SimStatus;
  notes?: string;
  executedAt?: string;
  tester?: string;
};

type SimStore = {
  runs: SimRun[];
  results: SimResult[];
};

const ISSUE_PREFIX = "ISS-SIM-";
const RUN_PREFIX = "simrun-";
const REPORT_ID = "rep-sim-latest";

function asStore(raw: unknown): SimStore | null {
  if (!raw || typeof raw !== "object") return null;
  const runs = (raw as { runs?: unknown }).runs;
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(runs) || !Array.isArray(results)) return null;
  return { runs: runs as SimRun[], results: results as SimResult[] };
}

export function readSimStore(): SimStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIM_STORE_KEY);
    if (!raw) return null;
    const rewritten = raw
      .replaceAll("geofence-violation", "no-fly-zone-violation")
      .replaceAll("Geofence violation", "No fly zone violation")
      .replaceAll("Geofence", "No fly zone")
      .replaceAll("geofence", "no fly zone");
    return asStore(JSON.parse(rewritten));
  } catch {
    return null;
  }
}

export function latestSimRun(store: SimStore): SimRun | null {
  if (!store.runs.length) return null;
  return [...store.runs].sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))[0];
}

function hubResult(status: SimStatus): RunResult | null {
  if (status === "passed") return "Pass";
  if (status === "failed") return "Fail";
  if (status === "blocked") return "Blocked";
  return null;
}

function missionOf(id: string) {
  return SUITE.find((item) => item.id === id) ?? null;
}

export function applySimLastRun(hub: HubState, store: SimStore | null): HubState {
  if (!store) return hub;
  const run = latestSimRun(store);
  if (!run) return hub;

  const scored = store.results.filter(
    (result) => result.testRunId === run.id && hubResult(result.status) !== null
  );
  const problems = scored.filter(
    (result) => result.status === "failed" || result.status === "blocked"
  );

  const simRuns: TestRun[] = scored.map((result) => {
    return {
      id: `${RUN_PREFIX}${run.id}-${result.testCaseId}`,
      testCaseId: result.testCaseId,
      droneId: "",
      buildId: "sim-b9c924f",
      startedAt: result.executedAt || run.startedAt,
      environment: "Simulator",
      result: hubResult(result.status) ?? "Not run",
      duration: "—",
      notes: [
        `SIM Flight Testing · ${run.name}`,
        run.tester ? `Tester ${run.tester}` : "",
        run.skyCommandVersion ? `SkyCommand ${run.skyCommandVersion}` : "",
        run.droneVersion ? `Drone ${run.droneVersion}` : "",
        result.notes?.trim() || "",
      ]
        .filter(Boolean)
        .join(". "),
      measurements: "",
      issueIds:
        result.status === "failed" || result.status === "blocked"
          ? [`${ISSUE_PREFIX}${result.testCaseId}`]
          : [],
      evidenceIds: [],
      reportId: REPORT_ID,
    };
  });

  const simIssues: Issue[] = problems.map((result) => {
    const testCase = hub.testCases.find((item) => item.id === result.testCaseId);
    const mission = missionOf(result.testCaseId);
    const failed = result.status === "failed";
    const previous = hub.issues.find((issue) => issue.id === `${ISSUE_PREFIX}${result.testCaseId}`);
    return {
      id: `${ISSUE_PREFIX}${result.testCaseId}`,
      title: `${testCase?.code ?? result.testCaseId} ${testCase?.name ?? mission?.name ?? result.testCaseId}`,
      severity: failed ? "HIGH" : "MEDIUM",
      status: previous?.status && previous.status !== "RESOLVED" ? previous.status : "OPEN",
      droneId: null,
      buildId: "sim-b9c924f",
      testRunId: `${RUN_PREFIX}${run.id}-${result.testCaseId}`,
      missionType: testCase?.missionType || mission?.category || "Simulator",
      environment: "Simulator",
      stepsToReproduce: (testCase?.steps || mission?.steps.map((step) => `${step.label}: ${step.instruction}`) || [
        mission?.procedure ?? "Fly the mission in SkyCommand, then record the result in SIM Flight Testing.",
      ]).join("\n"),
      expected: testCase?.expected || mission?.expectedBehavior || "",
      actual:
        result.notes?.trim() ||
        (failed
          ? "FAIL in the last SIM Flight Testing run. No notes were written."
          : "BLOCKED in the last SIM Flight Testing run. No notes were written."),
      assignee: result.tester || run.tester || hub.operator,
      retestResult: failed
        ? `Retest ${testCase?.name ?? result.testCaseId} on the next SIM run.`
        : "Blocked in SIM. Clear the blocker, then retest.",
      createdAt: result.executedAt || run.startedAt,
    };
  });

  const passed = scored.filter((result) => result.status === "passed").length;
  const failed = problems.filter((result) => result.status === "failed").length;
  const blocked = problems.filter((result) => result.status === "blocked").length;
  const overall: RunResult =
    failed > 0 ? "Fail" : blocked > 0 ? "Blocked" : passed > 0 ? "Pass" : "Not run";

  const report = {
    id: REPORT_ID,
    title: `SIM Flight Testing — ${run.name}`,
    date: (run.startedAt || "").slice(0, 10),
    droneIds: [] as string[],
    runIds: simRuns.map((item) => item.id),
    summary: [
      `${run.name}. Tester ${run.tester || "not set"}.`,
      run.skyCommandVersion ? `SkyCommand ${run.skyCommandVersion}.` : "",
      run.droneVersion ? `Drone software ${run.droneVersion}.` : "",
      `${passed} pass, ${failed} fail, ${blocked} blocked of ${scored.length} scored missions.`,
    ]
      .filter(Boolean)
      .join(" "),
    overall,
  };

  return {
    ...hub,
    runs: [...simRuns, ...hub.runs.filter((item) => !item.id.startsWith(RUN_PREFIX))],
    issues: [...simIssues, ...hub.issues.filter((item) => !item.id.startsWith(ISSUE_PREFIX))],
    reports: [report, ...hub.reports.filter((item) => item.id !== REPORT_ID)],
  };
}
