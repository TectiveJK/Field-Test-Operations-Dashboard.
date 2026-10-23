import {
  asReporterStore,
  preferReporter,
  reporterKey,
  slimReporterStore,
  type ReporterStore,
} from "@/lib/reporter-import";
import {
  asStore,
  preferSim,
  simKey,
  slimSimStore,
  type SimStore,
} from "@/lib/sim-import";
import type {
  ChecklistItem,
  DroneStatus,
  Evidence,
  FlightReport,
  GoDecision,
  HubState,
  Issue,
  KnowledgeNote,
  PlanStatus,
  TestRun,
} from "@/lib/types";

export const HUB_SYNC_URL = "https://extendsclass.com/api/json-storage/bin/dcfcacb";

const WRITE_PROXY = "https://cors.jimmywarting.deno.net/";

export type HubSyncPayload = {
  kind: "tective-ftod-hub";
  updatedAt: string;
  sim: SimStore | null;
  reporter: ReporterStore | null;
  hub: {
    decision: GoDecision;
    decisionReason: string;
    weather: string;
    operator: string;
    runs: TestRun[];
    issues: Issue[];
    reports: FlightReport[];
    evidence: Evidence[];
    knowledge: KnowledgeNote[];
    droneStatuses: { id: string; status: DroneStatus }[];
    planStatuses: { id: string; status: PlanStatus }[];
    checklist: { id: string; done: boolean; by: string; at: string | null }[];
  } | null;
};

function asPayload(raw: unknown): HubSyncPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { kind?: unknown; data?: unknown };
  if (typeof data.data === "string") {
    try {
      return asPayload(JSON.parse(data.data));
    } catch {
      return null;
    }
  }
  if (data.kind !== "tective-ftod-hub") return null;
  const item = raw as HubSyncPayload;
  return {
    kind: "tective-ftod-hub",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
    sim: asStore(item.sim),
    reporter: asReporterStore(item.reporter),
    hub: item.hub && typeof item.hub === "object" ? item.hub : null,
  };
}

function proxiedUrl(url: string) {
  if (typeof window === "undefined") return url;
  if (new URL(url).origin === window.location.origin) return url;
  const query = new URLSearchParams({
    cors: JSON.stringify({
      url,
      deleteRequestHeaders: ["Origin", "Sec-Fetch-Mode"],
    }),
  });
  return `${WRITE_PROXY}?${query.toString()}`;
}

function stamped(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

export async function fetchHubSync(): Promise<HubSyncPayload | null> {
  const url = stamped(HUB_SYNC_URL);
  const targets = typeof window === "undefined" ? [url] : [url, proxiedUrl(url)];
  let lastError: Error | null = null;
  for (const target of targets) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) {
        lastError = new Error("Shared hub list could not be loaded.");
        continue;
      }
      return asPayload(await response.json());
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Shared hub list could not be loaded.");
    }
  }
  throw lastError ?? new Error("Shared hub list could not be loaded.");
}

export function snapshotForSync(
  hub: HubState,
  sim: SimStore | null,
  reporter: ReporterStore | null,
  updatedAt: string
): HubSyncPayload {
  return {
    kind: "tective-ftod-hub",
    updatedAt,
    sim: slimSimStore(sim),
    reporter: slimReporterStore(reporter),
    hub: {
      decision: hub.decision,
      decisionReason: hub.decisionReason,
      weather: hub.weather,
      operator: hub.operator,
      runs: hub.runs,
      issues: hub.issues,
      reports: hub.reports,
      evidence: hub.evidence,
      knowledge: hub.knowledge,
      droneStatuses: hub.drones.map((drone) => ({ id: drone.id, status: drone.status })),
      planStatuses: hub.plan.map((item) => ({ id: item.id, status: item.status })),
      checklist: hub.checklist.map((item) => ({
        id: item.id,
        done: item.done,
        by: item.by,
        at: item.at,
      })),
    },
  };
}

export async function publishReporterExport(store: ReporterStore): Promise<void> {
  const reporter = slimReporterStore(store);
  if (!reporter) return;
  const remote = await fetchHubSync().catch(() => null);
  await publishHubSync({
    kind: "tective-ftod-hub",
    updatedAt: new Date().toISOString(),
    sim: remote?.sim ?? null,
    reporter,
    hub: remote?.hub ?? null,
  });
}

export async function publishHubSync(payload: HubSyncPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const targets =
    typeof window === "undefined" ? [HUB_SYNC_URL] : [proxiedUrl(HUB_SYNC_URL), HUB_SYNC_URL];
  let lastError: Error | null = null;
  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) return;
      lastError = new Error("Shared hub list could not be saved.");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Shared hub list could not be saved.");
    }
  }
  throw lastError ?? new Error("Shared hub list could not be saved.");
}

export function applyRemoteHub(hub: HubState, remote: HubSyncPayload["hub"]): HubState {
  if (!remote) return hub;
  const droneStatus = new Map(remote.droneStatuses?.map((item) => [item.id, item.status]));
  const planStatus = new Map(remote.planStatuses?.map((item) => [item.id, item.status]));
  const checks = new Map(remote.checklist?.map((item) => [item.id, item]));
  return {
    ...hub,
    decision: remote.decision ?? hub.decision,
    decisionReason: remote.decisionReason ?? hub.decisionReason,
    weather: remote.weather ?? hub.weather,
    operator: remote.operator ?? hub.operator,
    runs: Array.isArray(remote.runs) ? remote.runs : hub.runs,
    issues: Array.isArray(remote.issues) ? remote.issues : hub.issues,
    reports: Array.isArray(remote.reports) ? remote.reports : hub.reports,
    evidence: Array.isArray(remote.evidence) ? remote.evidence : hub.evidence,
    knowledge: Array.isArray(remote.knowledge) ? remote.knowledge : hub.knowledge,
    drones: hub.drones.map((drone) => {
      const status = droneStatus.get(drone.id);
      return status ? { ...drone, status } : drone;
    }),
    plan: hub.plan.map((item) => {
      const status = planStatus.get(item.id);
      return status ? { ...item, status } : item;
    }),
    checklist: hub.checklist.map((item) => {
      const saved = checks.get(item.id) as Pick<ChecklistItem, "done" | "by" | "at"> | undefined;
      return saved ? { ...item, done: saved.done, by: saved.by, at: saved.at } : item;
    }),
  };
}

export function shouldPublish(
  localUpdatedAt: string,
  localSim: SimStore | null,
  remote: HubSyncPayload | null,
  localReporter: ReporterStore | null = null
) {
  if (!remote) return Boolean(localUpdatedAt || simKey(localSim) || reporterKey(preferReporter(localReporter, null)));
  if (localUpdatedAt && localUpdatedAt > (remote.updatedAt || "")) return true;
  const chosen = preferSim(localSim, remote.sim);
  if (chosen && simKey(chosen) !== simKey(remote.sim)) return true;
  const localChosen = preferReporter(localReporter, null);
  const chosenReporter = preferReporter(localReporter, remote.reporter);
  if (!remote.reporter && reporterKey(localChosen)) return true;
  return (
    reporterKey(chosenReporter) !== reporterKey(remote.reporter) &&
    reporterKey(chosenReporter) === reporterKey(localChosen)
  );
}
