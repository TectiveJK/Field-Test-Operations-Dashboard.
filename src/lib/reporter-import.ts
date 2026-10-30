import snapshot from "@/lib/reporter-snapshot.json";
import { isAirframe, type HubState, type Issue, type RunResult, type TestCase, type TestRun } from "@/lib/types";

export const REPORTER_STORE_KEY = "dft-reporter-ios-draft-v1";
export const REPORTER_CACHE_KEY = "tective-ftod-reporter-live-v1";
export const REPORTER_EXPORT_CHANNEL = "tective-reporter-export";

const ISSUE_PREFIX = "ISS-REP-";
const RUN_PREFIX = "rep-run-";
const CASE_PREFIX = "rep-case-";
const EVIDENCE_PREFIX = "rep-ev-";
const REPORT_ID = "rep-latest";

const HEADER_FIELDS = [
  "vehiclePlate",
  "objectiveType",
  "objectiveType2",
  "objective",
  "location",
  "operator",
  "observer",
  "category",
  "weather",
] as const;

export const REPORTER_RESULTS = [
  "Pending",
  "Pass",
  "Pass with observations",
  "Fail",
  "Aborted",
] as const;
export type ReporterResult = (typeof REPORTER_RESULTS)[number];

export type ReporterFlight = {
  number: number;
  vehiclePlate: string;
  objectiveType: string;
  objectiveType2: string;
  objective: string;
  location: string;
  operator: string;
  observer: string;
  category: string;
  weather: string;
  equipment: string[];
  dateTime: string;
  duration: string;
  modes: string[];
  mission: string;
  anomalies: string;
  action: string;
  result: ReporterResult | string;
  logName: string;
  captureName: string;
  attachments: string[];
};

export type ReporterStore = {
  conclusion: string;
  flights: ReporterFlight[];
};

function asList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asResult(raw: unknown): string {
  const value = String(raw ?? "").trim();
  return (REPORTER_RESULTS as readonly string[]).includes(value) ? value : "Pending";
}

function fileNameOf(raw: unknown) {
  const value = String(raw ?? "").trim();
  if (!value || value === "None" || value === "N/A") return "";
  const stripped = value.replace(/\s*\(attached\)\s*$/i, "").trim();
  const base = stripped.split(/[/\\]/).pop() || stripped;
  return base.replace(/^evidence\//, "");
}

function headerOf(raw: Record<string, unknown> | ReporterFlight): Pick<
  ReporterFlight,
  (typeof HEADER_FIELDS)[number] | "equipment"
> {
  const item = raw as Record<string, unknown>;
  const header = {} as Record<string, string>;
  for (const key of HEADER_FIELDS) {
    const fallback = key === "category" ? item.droneCategory : "";
    header[key] = String(item[key] ?? fallback ?? "").trim();
  }
  return {
    ...(header as Pick<ReporterFlight, (typeof HEADER_FIELDS)[number]>),
    equipment: asList(item.equipment ?? item.equipmentHardware),
  };
}

function asFlight(raw: unknown, index: number, shared: Record<string, unknown> = {}): ReporterFlight | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const merged = { ...shared, ...item };
  const header = headerOf(merged as ReporterFlight);
  const number = Number(item.number ?? item.flightNumber ?? index + 1);
  return {
    number: Number.isFinite(number) && number > 0 ? number : index + 1,
    ...header,
    dateTime: String(item.dateTime ?? item.flightDateTime ?? "").trim(),
    duration: String(item.duration ?? "").trim(),
    modes: asList(item.modes ?? item.flightModes),
    mission: String(item.mission ?? item.missionPerformed ?? "").trim(),
    anomalies: String(item.anomalies ?? "").trim(),
    action: String(item.action ?? item.immediateAction ?? "").trim(),
    result: asResult(item.result ?? item.flightResult),
    logName: fileNameOf(item.logName ?? item.flightLogPath),
    captureName: fileNameOf(item.captureName ?? item.captureFilePath),
    attachments: asList(item.attachments).map((name) => fileNameOf(name)).filter(Boolean),
  };
}

export function asReporterStore(raw: unknown): ReporterStore | null {
  if (!raw || typeof raw !== "object") return null;
  const flights = (raw as { flights?: unknown }).flights;
  if (!Array.isArray(flights) || !flights.length) return null;
  const shared = raw as Record<string, unknown>;
  const parsed = flights
    .map((flight, index) => asFlight(flight, index, shared))
    .filter((flight): flight is ReporterFlight => flight !== null);
  if (!parsed.length) return null;
  return {
    conclusion: String((raw as { conclusion?: unknown }).conclusion ?? "").trim(),
    flights: parsed,
  };
}

export const SNAPSHOT_REPORTER: ReporterStore = asReporterStore(snapshot) ?? {
  conclusion: "",
  flights: [],
};

export function slimReporterStore(store: ReporterStore | null): ReporterStore | null {
  if (!store?.flights.length) return null;
  return {
    conclusion: store.conclusion,
    flights: store.flights.map((flight) => ({
      number: flight.number,
      vehiclePlate: flight.vehiclePlate,
      objectiveType: flight.objectiveType,
      objectiveType2: flight.objectiveType2,
      objective: flight.objective,
      location: flight.location,
      operator: flight.operator,
      observer: flight.observer,
      category: flight.category,
      weather: flight.weather,
      equipment: [...flight.equipment],
      dateTime: flight.dateTime,
      duration: flight.duration,
      modes: [...flight.modes],
      mission: flight.mission,
      anomalies: flight.anomalies,
      action: flight.action,
      result: flight.result,
      logName: flight.logName,
      captureName: flight.captureName,
      attachments: [...flight.attachments],
    })),
  };
}

export function isEmptyReporterDraft(store: ReporterStore | null): boolean {
  if (!store?.flights.length) return true;
  if (store.conclusion) return false;
  return store.flights.every(
    (flight) =>
      (!flight.result || flight.result === "Pending") &&
      !flight.mission &&
      !flight.anomalies &&
      !flight.objective &&
      !flight.location &&
      flight.equipment.length === 0
  );
}

function readStoredReporter(key: string): ReporterStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = asReporterStore(JSON.parse(raw));
    if (!parsed || isEmptyReporterDraft(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheReporterStore(store: ReporterStore | null) {
  if (typeof window === "undefined") return;
  const slim = slimReporterStore(store);
  if (!slim || isEmptyReporterDraft(slim)) return;
  try {
    window.localStorage.setItem(REPORTER_CACHE_KEY, JSON.stringify(slim));
  } catch {
    /* quota — keep the in-memory copy */
  }
}

export function readReporterStore(): ReporterStore | null {
  const draft = readStoredReporter(REPORTER_STORE_KEY);
  const cached = readStoredReporter(REPORTER_CACHE_KEY);
  if (!draft) return cached;
  if (!cached) {
    cacheReporterStore(draft);
    return draft;
  }
  const chosen = preferReporter(draft, cached);
  cacheReporterStore(chosen);
  return chosen;
}

function scoredFlights(store: ReporterStore) {
  return store.flights.filter((flight) => flight.result && flight.result !== "Pending");
}

function flightStartedAt(dateTime: string) {
  const raw = dateTime.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
}

function latestTime(store: ReporterStore | null) {
  if (!store) return 0;
  let max = 0;
  for (const flight of store.flights) {
    const stamp = Date.parse(flightStartedAt(flight.dateTime)) || 0;
    if (stamp > max) max = stamp;
  }
  return max;
}

export function reporterKey(store: ReporterStore | null): string {
  if (!store) return "";
  const scored = scoredFlights(store);
  const results = store.flights
    .map((flight) => `${flight.number}:${flight.result}:${flight.dateTime}:${flight.duration}`)
    .join("|");
  return `${scored.length}|${latestTime(store)}|${results}|${store.conclusion}`;
}

export function preferReporter(local: ReporterStore | null, remote: ReporterStore | null): ReporterStore {
  const left = slimReporterStore(isEmptyReporterDraft(local) ? null : local);
  const right = slimReporterStore(isEmptyReporterDraft(remote) ? null : remote);
  if (!left && !right) return SNAPSHOT_REPORTER;
  if (!left) return right ?? SNAPSHOT_REPORTER;
  if (!right) return left;
  const leftTime = latestTime(left);
  const rightTime = latestTime(right);
  const leftScored = scoredFlights(left).length;
  const rightScored = scoredFlights(right).length;
  if (leftTime !== rightTime) {
    if (leftTime === 0 || rightTime === 0) {
      if (leftScored !== rightScored) return leftScored > rightScored ? left : right;
      if (leftTime === 0 && reporterKey(left) !== reporterKey(SNAPSHOT_REPORTER)) return left;
      if (rightTime === 0 && reporterKey(right) !== reporterKey(SNAPSHOT_REPORTER)) return right;
    }
    return leftTime > rightTime ? left : right;
  }
  if (leftScored !== rightScored) return leftScored > rightScored ? left : right;
  return reporterKey(left).length >= reporterKey(right).length ? left : right;
}

export function overallFromReporter(store: ReporterStore): RunResult {
  const results = scoredFlights(store).map((flight) => String(flight.result));
  if (!results.length) return "Not run";
  const passed = results.some((result) => result === "Pass" || result === "Pass with observations");
  const failed = results.includes("Fail");
  const aborted = results.includes("Aborted");
  if ((failed || aborted) && passed) return "Pass with observations";
  if (failed) return "Fail";
  if (aborted) return "Aborted";
  if (results.includes("Pass with observations")) return "Pass with observations";
  if (results.every((result) => result === "Pass")) return "Pass";
  return "Not run";
}

function hubResult(result: string): RunResult {
  if (result === "Pass") return "Pass";
  if (result === "Pass with observations") return "Pass with observations";
  if (result === "Fail") return "Fail";
  if (result === "Aborted") return "Aborted";
  return "Not run";
}

function slug(name: string) {
  return name.toLowerCase().replaceAll(" ", "-");
}

function airframeId(equipment: string[], hub: HubState) {
  const names = equipment.filter((name) => !name.toLowerCase().includes("battery"));
  for (const name of names) {
    const id = slug(name);
    if (hub.drones.some((drone) => drone.id === id && isAirframe(drone))) return id;
  }
  for (const name of names) {
    const match = hub.drones.find(
      (drone) => isAirframe(drone) && drone.name.toLowerCase() === name.toLowerCase()
    );
    if (match) return match.id;
  }
  return names[0] ? slug(names[0]) : "";
}

function objectiveTypes(flight: ReporterFlight) {
  return [flight.objectiveType, flight.objectiveType2].map((item) => item.trim()).filter(Boolean).join(" / ");
}

function flightLabel(flight: ReporterFlight) {
  if (flight.objective.trim()) return flight.objective.trim();
  const types = objectiveTypes(flight);
  const number = `Flight ${String(flight.number).padStart(2, "0")}`;
  return types ? `${types} · ${number}` : number;
}

function caseIdOf(flight: ReporterFlight) {
  return `${CASE_PREFIX}${flight.number}`;
}

function runIdOf(flight: ReporterFlight) {
  return `${RUN_PREFIX}${flight.number}`;
}

function issueIdOf(flight: ReporterFlight) {
  return `${ISSUE_PREFIX}${flight.number}`;
}

export type ReporterSummary = {
  title: string;
  date: string;
  location: string;
  operator: string;
  observer: string;
  weather: string;
  equipment: string[];
  overall: RunResult;
  passed: number;
  observations: number;
  failed: number;
  aborted: number;
  pending: number;
  scored: number;
  conclusion: string;
};

export function summarizeReporter(store: ReporterStore | null): ReporterSummary | null {
  if (!store || isEmptyReporterDraft(store)) return null;
  const first = store.flights[0];
  const scored = scoredFlights(store);
  if (!scored.length && !store.conclusion) return null;
  const results = store.flights.map((flight) => String(flight.result));
  const equipment = [...new Set(store.flights.flatMap((flight) => flight.equipment))];
  const stamp = [...store.flights.map((flight) => flight.dateTime)].sort().at(-1) || first?.dateTime || "";
  return {
    title: "Drone Flight Test Reporter",
    date: stamp.slice(0, 10),
    location: first?.location || "",
    operator: first?.operator || "",
    observer: first?.observer || "",
    weather: first?.weather || "",
    equipment,
    overall: overallFromReporter(store),
    passed: results.filter((result) => result === "Pass").length,
    observations: results.filter((result) => result === "Pass with observations").length,
    failed: results.filter((result) => result === "Fail").length,
    aborted: results.filter((result) => result === "Aborted").length,
    pending: results.filter((result) => !result || result === "Pending").length,
    scored: scored.length,
    conclusion: store.conclusion,
  };
}

export function applyReporterDraft(hub: HubState, store: ReporterStore | null): HubState {
  const report = slimReporterStore(store) ?? SNAPSHOT_REPORTER;
  if (isEmptyReporterDraft(report)) {
    return {
      ...hub,
      testCases: hub.testCases.filter((item) => !item.id.startsWith(CASE_PREFIX)),
      runs: hub.runs.filter((item) => !item.id.startsWith(RUN_PREFIX)),
      issues: hub.issues.filter((item) => !item.id.startsWith(ISSUE_PREFIX)),
      reports: hub.reports.filter((item) => item.id !== REPORT_ID),
      evidence: hub.evidence.filter((item) => !item.id.startsWith(EVIDENCE_PREFIX)),
    };
  }

  const cases: TestCase[] = report.flights.map((flight) => ({
    id: caseIdOf(flight),
    code: `FLD-${String(flight.number).padStart(2, "0")}`,
    name: flightLabel(flight),
    missionType: objectiveTypes(flight) || "Field",
    environment: "Field",
    steps: [
      flight.mission && `Mission: ${flight.mission}`,
      flight.anomalies && `Anomaly: ${flight.anomalies}`,
      flight.action && `Action: ${flight.action}`,
    ].filter((item): item is string => Boolean(item)),
    expected: "Landing as commanded from Drone Flight Test Reporter.",
  }));

  const runs: TestRun[] = report.flights.map((flight) => {
    const result = hubResult(String(flight.result));
    const problem = result === "Fail" || result === "Aborted";
    const droneId = airframeId(flight.equipment, hub);
    const startedAt = flightStartedAt(flight.dateTime);
    return {
      id: runIdOf(flight),
      testCaseId: caseIdOf(flight),
      droneId,
      buildId: droneId ? hub.drones.find((drone) => drone.id === droneId)?.buildId ?? "" : "",
      startedAt: startedAt || `${report.flights[0]?.dateTime.slice(0, 10) || "1970-01-01"}T00:00:00`,
      environment: "Field",
      result,
      duration: flight.duration || "—",
      notes: [
        `Drone Flight Test Reporter · Flight ${String(flight.number).padStart(2, "0")}`,
        objectiveTypes(flight),
        flight.operator ? `Responsible ${flight.operator}` : "",
        flight.observer ? `Robotics ${flight.observer}` : "",
        flight.equipment.length ? `Equipment ${flight.equipment.join(", ")}` : "",
        flight.modes.length ? `Modes ${flight.modes.join(", ")}` : "",
        flight.mission,
        flight.anomalies,
        flight.action,
      ]
        .filter(Boolean)
        .join(". "),
      measurements: flight.duration ? `Duration ${flight.duration}` : "",
      issueIds: problem ? [issueIdOf(flight)] : [],
      evidenceIds: [
        flight.logName ? `${EVIDENCE_PREFIX}${flight.number}-log` : "",
        flight.captureName ? `${EVIDENCE_PREFIX}${flight.number}-pcap` : "",
      ].filter(Boolean),
      reportId: REPORT_ID,
    };
  });

  const issues: Issue[] = report.flights
    .filter((flight) => {
      const result = hubResult(String(flight.result));
      return result === "Fail" || result === "Aborted";
    })
    .map((flight) => {
      const previous = hub.issues.find((issue) => issue.id === issueIdOf(flight));
      const failed = String(flight.result) === "Fail";
      const droneId = airframeId(flight.equipment, hub) || null;
      return {
        id: issueIdOf(flight),
        title: `FLD-${String(flight.number).padStart(2, "0")} ${flightLabel(flight)}`,
        severity: failed ? "HIGH" : "MEDIUM",
        status: previous?.status && previous.status !== "RESOLVED" ? previous.status : "OPEN",
        droneId,
        buildId: droneId ? hub.drones.find((drone) => drone.id === droneId)?.buildId ?? null : null,
        testRunId: runIdOf(flight),
        missionType: objectiveTypes(flight) || "April Tag Landing test",
        environment: "Field",
        stepsToReproduce:
          flight.mission ||
          "Fly the sortie recorded in Drone Flight Test Reporter, then issue the landing command.",
        expected: "Landing as commanded, without uncommanded climb, drift or abort.",
        actual: flight.anomalies || `${flight.result} in Drone Flight Test Reporter. No anomaly text was written.`,
        assignee: flight.operator || hub.operator,
        retestResult: flight.action
          ? `${flight.action} Retest this landing on the next field flight.`
          : `Retest ${flightLabel(flight)} on the next field flight.`,
        createdAt: flightStartedAt(flight.dateTime) || new Date().toISOString(),
      };
    });

  const evidence = report.flights.flatMap((flight) => {
    const droneId = airframeId(flight.equipment, hub) || null;
    const items = [];
    if (flight.logName) {
      items.push({
        id: `${EVIDENCE_PREFIX}${flight.number}-log`,
        kind: "ULog" as const,
        filename: flight.logName,
        droneId,
        testRunId: runIdOf(flight),
        issueId: hubResult(String(flight.result)) === "Fail" ? issueIdOf(flight) : null,
        buildId: droneId ? hub.drones.find((drone) => drone.id === droneId)?.buildId ?? null : null,
        notes: `Flight log from Drone Flight Test Reporter · Flight ${String(flight.number).padStart(2, "0")}`,
      });
    }
    if (flight.captureName) {
      items.push({
        id: `${EVIDENCE_PREFIX}${flight.number}-pcap`,
        kind: "Wireshark" as const,
        filename: flight.captureName,
        droneId,
        testRunId: runIdOf(flight),
        issueId: null,
        buildId: droneId ? hub.drones.find((drone) => drone.id === droneId)?.buildId ?? null : null,
        notes: `Wireshark capture from Drone Flight Test Reporter · Flight ${String(flight.number).padStart(2, "0")}`,
      });
    }
    return items;
  });

  const first = report.flights[0];
  const summary = summarizeReporter(report);
  const droneIds = [
    ...new Set(runs.map((run) => run.droneId).filter(Boolean)),
  ];
  const stamp = summary?.date || first?.dateTime.slice(0, 10) || "";
  const flightReport = {
    id: REPORT_ID,
    title: `Drone Flight Test Reporter — ${first?.location || "field"} ${stamp}`.trim(),
    date: stamp,
    droneIds,
    runIds: runs.map((run) => run.id),
    summary: [
      first?.location ? `${first.location}.` : "",
      first?.operator ? `Responsible ${first.operator}.` : "",
      first?.observer ? `Robotics ${first.observer}.` : "",
      first?.weather ? first.weather.endsWith(".") ? first.weather : `${first.weather}.` : "",
      summary
        ? `${summary.passed} pass, ${summary.observations} observations, ${summary.failed} fail, ${summary.aborted} aborted of ${report.flights.length} flights.`
        : "",
      report.conclusion,
    ]
      .filter(Boolean)
      .join(" "),
    overall: summary?.overall ?? "Not run",
  };

  return {
    ...hub,
    weather: first?.weather || hub.weather,
    testCases: [...cases, ...hub.testCases.filter((item) => !item.id.startsWith(CASE_PREFIX))],
    runs: [...runs, ...hub.runs.filter((item) => !item.id.startsWith(RUN_PREFIX))],
    issues: [...issues, ...hub.issues.filter((item) => !item.id.startsWith(ISSUE_PREFIX))],
    reports: [flightReport, ...hub.reports.filter((item) => item.id !== REPORT_ID)],
    evidence: [...evidence, ...hub.evidence.filter((item) => !item.id.startsWith(EVIDENCE_PREFIX))],
  };
}
