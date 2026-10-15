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

export type HubSyncPayload = {
  kind: "tective-ftod-hub";
  updatedAt: string;
  sim: SimStore | null;
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
    hub: item.hub && typeof item.hub === "object" ? item.hub : null,
  };
}

export async function fetchHubSync(): Promise<HubSyncPayload | null> {
  const response = await fetch(`${HUB_SYNC_URL}?t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Shared hub list could not be loaded.");
  return asPayload(await response.json());
}

export function snapshotForSync(hub: HubState, sim: SimStore | null, updatedAt: string): HubSyncPayload {
  return {
    kind: "tective-ftod-hub",
    updatedAt,
    sim: slimSimStore(sim),
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

export async function publishHubSync(payload: HubSyncPayload): Promise<void> {
  const response = await fetch(HUB_SYNC_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Shared hub list could not be saved.");
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

export function shouldPublish(localUpdatedAt: string, localSim: SimStore | null, remote: HubSyncPayload | null) {
  if (!remote) return Boolean(localUpdatedAt || simKey(localSim));
  if (localUpdatedAt && localUpdatedAt > (remote.updatedAt || "")) return true;
  const chosen = preferSim(localSim, remote.sim);
  return Boolean(chosen && simKey(chosen) !== simKey(remote.sim) && simKey(chosen) === simKey(localSim));
}
