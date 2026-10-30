import { SUITE } from "@/lib/sim-suite";
import { isAirframe, type HubState, type Issue, type RunResult, type SoftwareBuild, type TestRun } from "@/lib/types";

export const SIM_STORE_KEY = "sim-flight-testing-store-v1";

/** Gitea SIM Flight Testing app on this computer (desktop icon / npm run open). */
export const SIM_APP_URL = "http://127.0.0.1:43147";

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
  completedAt?: string;
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

function artifactFingerprint(arts: SimArtifact[]): string {
  return arts
    .map((item) => `${item.packageName}:${item.filename}`)
    .sort()
    .join("|");
}

function runArtifactFingerprint(run: SimRun | null | undefined) {
  return artifactFingerprint(parseArtifacts(run?.artifacts));
}

function matchesOlderRun(store: SimStore, fingerprint: string, exceptRunId?: string) {
  if (!fingerprint) return false;
  return store.runs.some(
    (run) => run.id !== exceptRunId && runArtifactFingerprint(run) === fingerprint
  );
}

export function liveArtifacts(store: SimStore): SimArtifact[] {
  const current = parseArtifacts(store.artifacts);
  const run = latestSimRun(store);
  const runArts = parseArtifacts(run?.artifacts);
  if (current.length && runArts.length) {
    const currentFp = artifactFingerprint(current);
    const runFp = artifactFingerprint(runArts);
    if (currentFp !== runFp && matchesOlderRun(store, currentFp, run?.id)) {
      return runArts;
    }
    return current;
  }
  if (current.length) return current;
  return runArts;
}

export function liveArtifactsKey(store: SimStore | null): string {
  return store ? artifactFingerprint(liveArtifacts(store)) : "";
}

export function storedArtifactsKey(store: SimStore | null): string {
  return store ? artifactFingerprint(parseArtifacts(store.artifacts)) : "";
}

function preferArtifactList(left: SimStore, right: SimStore): SimArtifact[] {
  const liveA = liveArtifacts(left);
  const liveB = liveArtifacts(right);
  if (!liveA.length) return liveB;
  if (!liveB.length) return liveA;

  const leftRun = latestSimRun(left);
  const rightRun = latestSimRun(right);
  const leftTime = Date.parse(leftRun?.startedAt || "") || 0;
  const rightTime = Date.parse(rightRun?.startedAt || "") || 0;
  if (leftTime !== rightTime) return leftTime > rightTime ? liveA : liveB;

  const scoreA = artifactListScore(liveA);
  const scoreB = artifactListScore(liveB);
  if (scoreA !== scoreB) return scoreA > scoreB ? liveA : liveB;

  const leftStale = matchesOlderRun(left, artifactFingerprint(liveA), leftRun?.id);
  const rightStale = matchesOlderRun(right, artifactFingerprint(liveB), rightRun?.id);
  if (leftStale !== rightStale) return leftStale ? liveB : liveA;
  return liveA;
}

export function withSimAppArtifacts(base: SimStore | null, simApp: SimStore | null): SimStore | null {
  if (!simApp) return base;
  const arts = liveArtifacts(simApp);
  if (!arts.length) return base ?? simApp;
  if (!base) return { ...simApp, artifacts: arts };
  return { ...base, artifacts: arts };
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
      status: asStatus(result.status),
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
      completedAt: run.completedAt,
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

function storeFromSimPayload(raw: unknown): SimStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { sim?: unknown; store?: unknown };
  return asStore(data.sim) ?? asStore(data.store) ?? asStore(raw);
}

/** Live results from the Gitea SIM app running on this computer. */
export async function fetchLocalSimStore(): Promise<SimStore | null> {
  if (typeof window === "undefined") return null;
  const urls = [`${SIM_APP_URL}/api/hub-snapshot`, `${SIM_APP_URL}/api/data`];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) continue;
      const store = slimSimStore(storeFromSimPayload(await response.json()));
      if (store) return store;
    } catch {
      // Sim app is not running on this computer, or this page is HTTPS.
    }
  }
  return null;
}

function asStatus(raw: unknown): SimStatus {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
  if (value === "pass") return "passed";
  if (value === "fail") return "failed";
  if (value === "block") return "blocked";
  if (value === "passed" || value === "failed" || value === "blocked" || value === "not_tested" || value === "not_applicable") {
    return value;
  }
  return "not_tested";
}

function hubResult(status: SimStatus | string): RunResult | null {
  if (status === "passed") return "Pass";
  if (status === "failed") return "Fail";
  if (status === "blocked") return "Blocked";
  return null;
}

function scoredResults(store: SimStore, runId: string | undefined) {
  if (!runId) return [];
  return store.results.filter((result) => result.testRunId === runId && hubResult(result.status) !== null);
}

function statusMark(store: SimStore, runId: string | undefined) {
  return scoredResults(store, runId)
    .map((result) => `${result.testCaseId}:${result.status}:${result.notes ?? ""}`)
    .sort()
    .join("|");
}


export function latestSimRun(store: SimStore): SimRun | null {
  if (!store.runs.length) return null;
  return [...store.runs].sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))[0];
}

export function latestScoredSimRun(store: SimStore): SimRun | null {
  const ranked = [...store.runs].sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
  return ranked.find((run) => scoredResults(store, run.id).length > 0) ?? null;
}

export function simKey(store: SimStore | null): string {
  if (!store) return "";
  const run = latestScoredSimRun(store) ?? latestSimRun(store);
  const scored = scoredResults(store, run?.id);
  const artifacts = liveArtifacts(store)
    .map((item) => item.filename)
    .join("|");
  return `${run?.startedAt ?? ""}|${run?.id ?? ""}|${scored.length}|${statusMark(store, run?.id)}|${artifacts}`;
}

function resultRank(status: string | undefined) {
  if (hubResult(status ?? "")) return 2;
  if (status === "not_applicable") return 1;
  return 0;
}

function mergeResults(left: SimResult[], right: SimResult[]): SimResult[] {
  const map = new Map<string, SimResult>();
  for (const result of [...right, ...left]) {
    const key = `${result.testRunId}:${result.testCaseId}`;
    const previous = map.get(key);
    if (!previous) {
      map.set(key, result);
      continue;
    }
    const nextRank = resultRank(result.status);
    const prevRank = resultRank(previous.status);
    if (nextRank > prevRank) {
      map.set(key, result);
      continue;
    }
    if (nextRank === prevRank && (result.executedAt || "") > (previous.executedAt || "")) {
      map.set(key, result);
    }
  }
  return [...map.values()];
}

function mergeRuns(left: SimRun[], right: SimRun[]): SimRun[] {
  const map = new Map<string, SimRun>();
  for (const run of [...right, ...left]) {
    const previous = map.get(run.id);
    if (!previous) {
      map.set(run.id, run);
      continue;
    }
    map.set(run.id, {
      ...previous,
      ...run,
      completedAt: run.completedAt || previous.completedAt,
      artifacts: (run.artifacts?.length ? run.artifacts : previous.artifacts) ?? [],
    });
  }
  return [...map.values()].sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
}

function mergeStores(left: SimStore, right: SimStore): SimStore {
  const artifacts = preferArtifactList(left, right);
  return {
    artifacts: artifacts.length ? artifacts : liveArtifacts(left),
    runs: mergeRuns(left.runs, right.runs),
    results: mergeResults(left.results, right.results),
  };
}

export function preferSim(local: SimStore | null, remote: SimStore | null): SimStore | null {
  const left = slimSimStore(local);
  const right = slimSimStore(remote);
  if (!left) return right;
  if (!right) return left;
  return mergeStores(left, right);
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
  openRunName: string;
};

export function summarizeSim(store: SimStore | null): SimRunSummary | null {
  if (!store) return null;
  const scoredRun = latestScoredSimRun(store);
  const latest = latestSimRun(store);
  const run = scoredRun ?? latest;
  if (!run) return null;
  const scored = scoredResults(store, run.id);
  const openRunName = latest && scoredRun && latest.id !== scoredRun.id ? latest.name : "";
  return {
    name: run.name,
    startedAt: run.startedAt,
    tester: run.tester || "",
    passed: scored.filter((result) => result.status === "passed").length,
    failed: scored.filter((result) => result.status === "failed").length,
    blocked: scored.filter((result) => result.status === "blocked").length,
    scored: scored.length,
    artifacts: artifactsOf(store, run),
    openRunName,
  };
}

function fileFor(artifacts: SimArtifact[], packageName: string) {
  return artifacts.find((item) => item.packageName === packageName)?.filename ?? "";
}

export function buildFromSim(store: SimStore, run: SimRun | null): SoftwareBuild | null {
  const artifacts = artifactsOf(store, run);
  const skyCommand = fileFor(artifacts, "web-ground-control");
  const gcs = fileFor(artifacts, "mission-planner");
  const autonomyNode = fileFor(artifacts, "tective-simulator") || fileFor(artifacts, "autonomy-node");
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

function missionOf(id: string) {
  return SUITE.find((item) => item.id === id) ?? null;
}

export function applySimLastRun(hub: HubState, store: SimStore | null): HubState {
  if (!store) return hub;
  const run = latestScoredSimRun(store);
  const build = buildFromSim(store, run ?? latestSimRun(store));
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
