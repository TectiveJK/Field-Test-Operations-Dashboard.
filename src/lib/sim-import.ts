import { SUITE } from "@/lib/sim-suite";
import { isAirframe, type HubState, type Issue, type RunResult, type SoftwareBuild, type TestRun } from "@/lib/types";

export const SIM_STORE_KEY = "sim-flight-testing-store-v1";

type SimStatus = "passed" | "failed" | "blocked" | "not_tested" | "not_applicable";

export type SimArtifact = {
  id?: string;
  packageName: string;
  filename: string;
};

export type SimRun = {
  id: string;
  number?: number;
  name: string;
  skyCommandVersion?: string;
  droneVersion?: string;
  tester?: string;
  startedAt: string;
  notes?: string;
  artifacts?: SimArtifact[];
};

export type SimResult = {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: SimStatus;
  notes?: string;
  executedAt?: string;
  tester?: string;
};

export type SimStore = {
  artifacts?: SimArtifact[];
  runs: SimRun[];
  results: SimResult[];
};

const ISSUE_PREFIX = "ISS-SIM-";
const RUN_PREFIX = "simrun-";
const REPORT_ID = "rep-sim-latest";

const CATALOG_DEFAULT_MARK = "b9c924f";
const CATALOG_PACKAGE_NAMES = ["web-ground-control", "mission-planner", "tective-simulator"];

function asArtifact(raw: unknown): SimArtifact | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<SimArtifact>;
  const filename = String(item.filename ?? "").trim();
  if (!filename) return null;
  const packageName =
    String(item.packageName ?? "").trim() || filename.replace(/_.*$/, "").replace(/\.deb$/i, "");
  if (!packageName) return null;
  return { id: String(item.id ?? packageName), packageName, filename };
}

function parseArtifacts(raw: unknown): SimArtifact[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asArtifact).filter((item): item is SimArtifact => item !== null);
}

export function isCatalogDefaultArtifacts(arts: SimArtifact[]): boolean {
  return arts.length > 0 && arts.every((item) => item.filename.includes(CATALOG_DEFAULT_MARK));
}

function artifactListScore(arts: SimArtifact[]): number {
  if (!arts.length) return 0;
  const updatedFiles = arts.filter((item) => !item.filename.includes(CATALOG_DEFAULT_MARK)).length;
  const renamed = arts.filter((item) => !CATALOG_PACKAGE_NAMES.includes(item.packageName)).length;
  return updatedFiles * 100 + renamed * 50 + arts.length;
}

export function liveArtifacts(store: SimStore): SimArtifact[] {
  const current = parseArtifacts(store.artifacts);
  if (current.length) return current;
  const run = latestSimRun(store);
  return parseArtifacts(run?.artifacts);
}

function preferArtifactList(left: SimStore, right: SimStore): SimArtifact[] {
  const a = parseArtifacts(left.artifacts);
  const b = parseArtifacts(right.artifacts);
  if (artifactListScore(a) >= artifactListScore(b)) return a.length ? a : b;
  return b;
}

export function asStore(raw: unknown): SimStore | null {
  if (!raw || typeof raw !== "object") return null;
  const runs = (raw as { runs?: unknown }).runs;
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(runs) || !Array.isArray(results)) return null;
  const artifacts = parseArtifacts((raw as { artifacts?: unknown }).artifacts);
  return {
    artifacts,
    runs: (runs as unknown[]).map((run) => {
      if (!run || typeof run !== "object") return run as SimRun;
      const item = run as SimRun;
      return { ...item, artifacts: parseArtifacts(item.artifacts) };
    }),
    results: (results as SimResult[]).map((result) => ({
      ...result,
      notes: result.notes ?? "",
    })),
  };
}

export function slimSimStore(store: SimStore | null): SimStore | null {
  if (!store) return null;
  const artifacts = liveArtifacts(store);
  return {
    artifacts,
    runs: store.runs.map((run) => ({
      id: run.id,
      number: run.number,
      name: run.name,
      skyCommandVersion: run.skyCommandVersion,
      droneVersion: run.droneVersion,
      tester: run.tester,
      startedAt: run.startedAt,
      notes: run.notes,
      artifacts: (run.artifacts ?? []).map((item) => ({
        id: item.id,
        packageName: item.packageName,
        filename: item.filename,
      })),
    })),
    results: store.results.map((result) => ({
      id: result.id,
      testRunId: result.testRunId,
      testCaseId: result.testCaseId,
      status: result.status,
      notes: result.notes,
      executedAt: result.executedAt,
      tester: result.tester,
    })),
  };
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

export function simKey(store: SimStore | null): string {
  if (!store) return "";
  const run = latestSimRun(store);
  const scored = store.results.filter((result) => result.testRunId === run?.id).length;
  const artifacts = liveArtifacts(store)
    .map((item) => item.filename)
    .join("|");
  return `${run?.startedAt ?? ""}|${run?.id ?? ""}|${scored}|${artifacts}`;
}

function withLiveArtifacts(winner: SimStore, left: SimStore, right: SimStore): SimStore {
  const artifacts = preferArtifactList(left, right);
  return {
    ...winner,
    artifacts: artifacts.length ? artifacts : liveArtifacts(winner),
  };
}

export function preferSim(local: SimStore | null, remote: SimStore | null): SimStore | null {
  const left = slimSimStore(local);
  const right = slimSimStore(remote);
  if (!left) return right;
  if (!right) return left;
  const localRun = latestSimRun(left);
  const remoteRun = latestSimRun(right);
  const localTime = Date.parse(localRun?.startedAt || "") || 0;
  const remoteTime = Date.parse(remoteRun?.startedAt || "") || 0;
  if (localTime !== remoteTime) {
    return withLiveArtifacts(localTime > remoteTime ? left : right, left, right);
  }
  const localCount = left.results.filter((result) => result.testRunId === localRun?.id).length;
  const remoteCount = right.results.filter((result) => result.testRunId === remoteRun?.id).length;
  if (localCount !== remoteCount) {
    return withLiveArtifacts(localCount > remoteCount ? left : right, left, right);
  }
  const localArts = liveArtifacts(left).map((item) => item.filename).join("|");
  const remoteArts = liveArtifacts(right).map((item) => item.filename).join("|");
  const winner = localArts === remoteArts || localArts.length < remoteArts.length ? right : left;
  return withLiveArtifacts(winner, left, right);
}

export function artifactsOf(store: SimStore, run: SimRun | null): SimArtifact[] {
  const live = liveArtifacts(store);
  if (live.length) return live;
  return parseArtifacts(run?.artifacts);
}

export type SimRunSummary = {
  name: string;
  startedAt: string;
  tester: string;
  passed: number;
  failed: number;
  blocked: number;
  scored: number;
  artifacts: SimArtifact[];
};

export function summarizeSim(store: SimStore | null): SimRunSummary | null {
  if (!store) return null;
  const run = latestSimRun(store);
  if (!run) return null;
  const scored = store.results.filter(
    (result) => result.testRunId === run.id && hubResult(result.status) !== null
  );
  return {
    name: run.name,
    startedAt: run.startedAt,
    tester: run.tester || "",
    passed: scored.filter((result) => result.status === "passed").length,
    failed: scored.filter((result) => result.status === "failed").length,
    blocked: scored.filter((result) => result.status === "blocked").length,
    scored: scored.length,
    artifacts: artifactsOf(store, run),
  };
}

function fileFor(artifacts: SimArtifact[], packageName: string) {
  return artifacts.find((item) => item.packageName === packageName)?.filename ?? "";
}

export function buildFromSim(store: SimStore, run: SimRun | null): SoftwareBuild | null {
  const artifacts = artifactsOf(store, run);
  const skyCommand = fileFor(artifacts, "web-ground-control");
  const gcs = fileFor(artifacts, "mission-planner");
  const autonomyNode = fileFor(artifacts, "tective-simulator");
  if (!skyCommand && !gcs && !autonomyNode) return null;
  const stamp = [skyCommand, gcs, autonomyNode].filter(Boolean).join(" ").replaceAll(/[^a-z0-9]+/gi, "-").slice(0, 56);
  return {
    id: `sim-${stamp || "packages"}`,
    label: "SIM Flight Testing packages",
    jenkins: "",
    px4: "",
    skyCommand,
    skyHive: "",
    gcs,
    autonomyNode,
    notes: run
      ? [`From ${run.name}.`, run.skyCommandVersion ? `SkyCommand ${run.skyCommandVersion}.` : "", run.droneVersion ? `Drone ${run.droneVersion}.` : ""]
          .filter(Boolean)
          .join(" ")
      : "From SIM Flight Testing.",
  };
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
  const build = buildFromSim(store, run);
  let next = hub;
  if (build) {
    next = {
      ...next,
      builds: [build, ...next.builds.filter((item) => !item.id.startsWith("sim-"))],
      drones: next.drones.map((drone) =>
        isAirframe(drone) && (!drone.buildId || drone.buildId.startsWith("sim-"))
          ? { ...drone, buildId: build.id }
          : drone
      ),
    };
  }
  if (!run) return next;
  const buildId = build?.id ?? next.builds.find((item) => item.id.startsWith("sim-"))?.id ?? "";

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
      buildId,
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
    const testCase = next.testCases.find((item) => item.id === result.testCaseId);
    const mission = missionOf(result.testCaseId);
    const failed = result.status === "failed";
    const previous = next.issues.find((issue) => issue.id === `${ISSUE_PREFIX}${result.testCaseId}`);
    return {
      id: `${ISSUE_PREFIX}${result.testCaseId}`,
      title: `${testCase?.code ?? result.testCaseId} ${testCase?.name ?? mission?.name ?? result.testCaseId}`,
      severity: failed ? "HIGH" : "MEDIUM",
      status: previous?.status && previous.status !== "RESOLVED" ? previous.status : "OPEN",
      droneId: null,
      buildId,
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
      assignee: result.tester || run.tester || next.operator,
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
      build?.skyCommand ? `${build.skyCommand}.` : "",
      `${passed} pass, ${failed} fail, ${blocked} blocked of ${scored.length} scored missions.`,
    ]
      .filter(Boolean)
      .join(" "),
    overall,
  };

  return {
    ...next,
    runs: [...simRuns, ...next.runs.filter((item) => !item.id.startsWith(RUN_PREFIX))],
    issues: [...simIssues, ...next.issues.filter((item) => !item.id.startsWith(ISSUE_PREFIX))],
    reports: [report, ...next.reports.filter((item) => item.id !== REPORT_ID)],
  };
}
