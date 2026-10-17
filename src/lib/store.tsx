"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { newId } from "@/lib/format";
import {
  addHardware,
  applyHardware,
  cacheHardware,
  fetchHardwareItems,
  listenSharedHardware,
  readSharedHardware,
  starterHardware,
  updateHardware,
} from "@/lib/hardware";
import {
  applyRemoteHub,
  fetchHubSync,
  publishHubSync,
  shouldPublish,
  snapshotForSync,
  type HubSyncPayload,
} from "@/lib/hub-sync";
import { STORAGE_KEY, cloneSeed, seedState } from "@/lib/seed";
import {
  applySimLastRun,
  preferSim,
  readSimStore,
  SIM_STORE_KEY,
  slimSimStore,
  type SimStore,
} from "@/lib/sim-import";
import {
  addUpcomingEntry,
  fetchUpcomingEntries,
  planFromUpcoming,
  removeUpcomingEntry,
  updateUpcomingEntry,
  validateUpcomingInput,
  type UpcomingInput,
} from "@/lib/upcoming";
import type {
  ChecklistItem,
  DroneStatus,
  EvidenceKind,
  GoDecision,
  HubState,
  IssueSeverity,
  IssueStatus,
  PlanStatus,
  RunResult,
} from "@/lib/types";

type StoreApi = {
  ready: boolean;
  state: HubState;
  lastSim: SimStore | null;
  setDecision: (decision: GoDecision, reason: string) => void;
  setPlanStatus: (id: string, status: PlanStatus) => void;
  setRunResult: (id: string, result: RunResult, notes?: string) => void;
  addRun: (input: {
    testCaseId: string;
    droneId: string;
    buildId: string;
    environment: "Field" | "Simulator";
    result: RunResult;
    notes: string;
    measurements: string;
  }) => void;
  setDroneStatus: (id: string, status: DroneStatus) => void;
  setIssueStatus: (id: string, status: IssueStatus) => void;
  addIssue: (input: {
    title: string;
    severity: IssueSeverity;
    droneId: string | null;
    missionType: string;
    stepsToReproduce: string;
    expected: string;
    actual: string;
  }) => void;
  toggleCheck: (id: string) => void;
  addEvidence: (input: {
    kind: EvidenceKind;
    filename: string;
    droneId: string | null;
    testRunId: string | null;
    notes: string;
  }) => void;
  saveHardware: (input: {
    item: string;
    location: string;
    person: string;
    note: string;
  }) => Promise<void>;
  addHardwareItem: (input: {
    name: string;
    location: string;
    person: string;
    note: string;
  }) => Promise<void>;
  savePlanEntry: (input: UpcomingInput & { id?: string }) => Promise<void>;
  removePlanEntry: (id: string) => Promise<void>;
  reset: () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

const META_KEY = "tective-ftod-sync-meta-v1";
const listeners = new Set<() => void>();
let memory: HubState = seedState;
let clientAttached = false;
let lastSim: SimStore | null = null;
let localUpdatedAt = "";
let publishTimer: number | null = null;
let refreshing = false;

function emit() {
  for (const listener of listeners) listener();
}

function persist(state: HubState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: localUpdatedAt }));
}

function readPersisted(): HubState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as HubState;
    if (!parsed || !Array.isArray(parsed.testCases) || !Array.isArray(parsed.plan)) return cloneSeed();
    return parsed;
  } catch {
    return cloneSeed();
  }
}

function readMeta() {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    if (typeof parsed.updatedAt === "string") localUpdatedAt = parsed.updatedAt;
  } catch {
    localUpdatedAt = "";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!clientAttached) {
    clientAttached = true;
    readMeta();
    lastSim = slimSimStore(readSimStore());
    const persisted = applySimLastRun(readPersisted(), lastSim);
    const shared = readSharedHardware();
    const live = shared?.items.length
      ? shared.items
      : persisted.drones.some((drone) => drone.location)
        ? null
        : starterHardware();
    memory = live ? applyHardware(persisted, live) : persisted;
    persist(memory);
    queueMicrotask(emit);
    attachLiveRefresh();
    void refreshAll();
  }
  return () => {
    listeners.delete(listener);
  };
}

function attachLiveRefresh() {
  const onVisible = () => {
    if (document.visibilityState === "visible") void refreshAll();
  };
  window.addEventListener("focus", () => void refreshAll());
  window.addEventListener("online", () => void refreshAll());
  window.addEventListener("pageshow", () => void refreshAll());
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("storage", (event) => {
    if (event.key === SIM_STORE_KEY || event.key === STORAGE_KEY) void refreshAll();
  });
  listenSharedHardware((items) => {
    cacheHardware(items, false);
    write((current) => applyHardware(current, items), false);
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible") void refreshAll();
  }, 8000);
}

async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  try {
    const localSim = slimSimStore(readSimStore());
    const [upcoming, hardware, remote] = await Promise.all([
      fetchUpcomingEntries().catch(() => null),
      fetchHardwareItems().catch(() => readSharedHardware()?.items ?? null),
      fetchHubSync().catch(() => null),
    ]);
    const chosenSim = preferSim(localSim, remote?.sim ?? null);
    lastSim = chosenSim;
    const remoteHubNewer = Boolean(remote?.updatedAt && remote.updatedAt > (localUpdatedAt || ""));
    write((current) => {
      let next = current;
      if (upcoming) next = { ...next, plan: planFromUpcoming(upcoming, next.plan) };
      if (remoteHubNewer) next = applyRemoteHub(next, remote?.hub ?? null);
      next = applySimLastRun(next, chosenSim);
      if (hardware) next = applyHardware(next, hardware);
      return next;
    }, false);
    if (remoteHubNewer && remote?.updatedAt) {
      localUpdatedAt = remote.updatedAt;
      persist(memory);
    }
    if (shouldPublish(localUpdatedAt, chosenSim, remote)) schedulePublish(remote);
  } finally {
    refreshing = false;
  }
}

function schedulePublish(remote?: HubSyncPayload | null) {
  if (typeof window === "undefined") return;
  if (publishTimer) window.clearTimeout(publishTimer);
  publishTimer = window.setTimeout(() => {
    publishTimer = null;
    void pushShared(remote);
  }, 800);
}

async function pushShared(knownRemote?: HubSyncPayload | null) {
  if (!navigator.onLine) return;
  try {
    const remote = knownRemote === undefined ? await fetchHubSync().catch(() => null) : knownRemote;
    const deviceSim = preferSim(readSimStore(), lastSim);
    const sim = preferSim(deviceSim, remote?.sim ?? null);
    lastSim = sim;
    if (!shouldPublish(localUpdatedAt, deviceSim, remote)) return;
    const updatedAt = localUpdatedAt || new Date().toISOString();
    localUpdatedAt = updatedAt;
    await publishHubSync(snapshotForSync(memory, sim, updatedAt));
    persist(memory);
  } catch {
    // Stay on the device copy when the shared board is unreachable.
  }
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return seedState;
}

function write(updater: (current: HubState) => HubState, sync = true) {
  memory = updater(memory);
  if (sync) localUpdatedAt = new Date().toISOString();
  persist(memory);
  emit();
  if (sync) schedulePublish();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = state !== seedState || clientAttached;
  const sim = lastSim;

  const setDecision = useCallback((decision: GoDecision, reason: string) => {
    write((current) => ({ ...current, decision, decisionReason: reason }));
  }, []);

  const setPlanStatus = useCallback((id: string, status: PlanStatus) => {
    write((current) => ({
      ...current,
      plan: current.plan.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
  }, []);

  const setRunResult = useCallback((id: string, result: RunResult, notes?: string) => {
    write((current) => ({
      ...current,
      runs: current.runs.map((run) =>
        run.id === id
          ? { ...run, result, notes: notes ?? run.notes }
          : run
      ),
      drones: current.drones.map((drone) => {
        const run = current.runs.find((item) => item.id === id);
        if (!run || drone.id !== run.droneId) return drone;
        if (result === "Not run") return { ...drone, status: "Under test" as const };
        if (result === "Fail" || result === "Aborted") return drone;
        return { ...drone, status: drone.status === "Under test" ? "Available" : drone.status };
      }),
    }));
  }, []);

  const addRun = useCallback(
    (input: {
      testCaseId: string;
      droneId: string;
      buildId: string;
      environment: "Field" | "Simulator";
      result: RunResult;
      notes: string;
      measurements: string;
    }) => {
      write((current) => ({
        ...current,
        runs: [
          {
            id: newId("run"),
            testCaseId: input.testCaseId,
            droneId: input.droneId,
            buildId: input.buildId,
            startedAt: new Date().toISOString(),
            environment: input.environment,
            result: input.result,
            duration: "—",
            notes: input.notes,
            measurements: input.measurements,
            issueIds: [],
            evidenceIds: [],
            reportId: null,
          },
          ...current.runs,
        ],
      }));
    },
    []
  );

  const setDroneStatus = useCallback((id: string, status: DroneStatus) => {
    write((current) => ({
      ...current,
      drones: current.drones.map((drone) => (drone.id === id ? { ...drone, status } : drone)),
    }));
  }, []);

  const setIssueStatus = useCallback((id: string, status: IssueStatus) => {
    write((current) => ({
      ...current,
      issues: current.issues.map((issue) => (issue.id === id ? { ...issue, status } : issue)),
    }));
  }, []);

  const addIssue = useCallback(
    (input: {
      title: string;
      severity: IssueSeverity;
      droneId: string | null;
      missionType: string;
      stepsToReproduce: string;
      expected: string;
      actual: string;
    }) => {
      write((current) => ({
        ...current,
        issues: [
          {
            id: `ISS-${Math.floor(16 + Math.random() * 80)}`,
            title: input.title,
            severity: input.severity,
            status: "OPEN",
            droneId: input.droneId,
            buildId: input.droneId
              ? current.drones.find((drone) => drone.id === input.droneId)?.buildId ?? null
              : null,
            testRunId: null,
            missionType: input.missionType,
            environment: "Field",
            stepsToReproduce: input.stepsToReproduce,
            expected: input.expected,
            actual: input.actual,
            assignee: current.operator,
            retestResult: "",
            createdAt: new Date().toISOString(),
          },
          ...current.issues,
        ],
      }));
    },
    []
  );

  const toggleCheck = useCallback((id: string) => {
    write((current) => ({
      ...current,
      checklist: current.checklist.map((item) => {
        if (item.id !== id) return item;
        const done = !item.done;
        const next: ChecklistItem = done
          ? { ...item, done: true, by: current.operator.split(" ").map((p) => p[0]).join(""), at: new Date().toISOString() }
          : { ...item, done: false, by: "", at: null };
        return next;
      }),
    }));
  }, []);

  const addEvidence = useCallback(
    (input: {
      kind: EvidenceKind;
      filename: string;
      droneId: string | null;
      testRunId: string | null;
      notes: string;
    }) => {
      write((current) => {
        const run = current.runs.find((item) => item.id === input.testRunId);
        const evidenceId = newId("ev");
        return {
          ...current,
          evidence: [
            {
              id: evidenceId,
              kind: input.kind,
              filename: input.filename,
              droneId: input.droneId,
              testRunId: input.testRunId,
              issueId: null,
              buildId: run?.buildId ?? null,
              notes: input.notes,
            },
            ...current.evidence,
          ],
          runs: current.runs.map((item) =>
            item.id === input.testRunId
              ? { ...item, evidenceIds: [evidenceId, ...item.evidenceIds] }
              : item
          ),
        };
      });
    },
    []
  );

  const saveHardware = useCallback(
    async (input: { item: string; location: string; person: string; note: string }) => {
      const items = await updateHardware(input);
      write((current) => applyHardware(current, items), false);
      void refreshAll();
    },
    []
  );

  const addHardwareItem = useCallback(
    async (input: { name: string; location: string; person: string; note: string }) => {
      const items = await addHardware(input);
      write((current) => applyHardware(current, items), false);
      void refreshAll();
    },
    []
  );

  const savePlanEntry = useCallback(async (input: UpcomingInput & { id?: string }) => {
    const checked = validateUpcomingInput(input);
    if (!checked.ok) throw new Error(checked.error);
    const entries = input.id
      ? await updateUpcomingEntry(input.id, checked.value)
      : await addUpcomingEntry(checked.value);
    write((current) => ({
      ...current,
      plan: planFromUpcoming(entries, current.plan),
    }));
  }, []);

  const removePlanEntry = useCallback(async (id: string) => {
    const entries = await removeUpcomingEntry(id);
    write((current) => ({
      ...current,
      plan: planFromUpcoming(entries, current.plan),
    }));
  }, []);

  const reset = useCallback(() => {
    localUpdatedAt = "";
    lastSim = slimSimStore(readSimStore());
    memory = applyHardware(applySimLastRun(cloneSeed(), lastSim), starterHardware());
    persist(memory);
    emit();
    void refreshAll();
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      lastSim: sim,
      setDecision,
      setPlanStatus,
      setRunResult,
      addRun,
      setDroneStatus,
      setIssueStatus,
      addIssue,
      toggleCheck,
      addEvidence,
      saveHardware,
      addHardwareItem,
      savePlanEntry,
      removePlanEntry,
      reset,
    }),
    [
      ready,
      state,
      sim,
      setDecision,
      setPlanStatus,
      setRunResult,
      addRun,
      setDroneStatus,
      setIssueStatus,
      addIssue,
      toggleCheck,
      addEvidence,
      saveHardware,
      addHardwareItem,
      savePlanEntry,
      removePlanEntry,
      reset,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useHub() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useHub must be used inside StoreProvider");
  return value;
}
