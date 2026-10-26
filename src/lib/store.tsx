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
  publishSimExport,
  shouldPublish,
  snapshotForSync,
  type HubSyncPayload,
} from "@/lib/hub-sync";
import { STORAGE_KEY, cloneSeed, seedState } from "@/lib/seed";
import {
  applyReporterDraft,
  asReporterStore,
  cacheReporterStore,
  isEmptyReporterDraft,
  preferReporter,
  readReporterStore,
  reporterKey,
  REPORTER_CACHE_KEY,
  REPORTER_EXPORT_CHANNEL,
  REPORTER_STORE_KEY,
  slimReporterStore,
  SNAPSHOT_REPORTER,
  type ReporterStore,
} from "@/lib/reporter-import";
import {
  applySimLastRun,
  artifactKey,
  asStore,
  cacheSimStore,
  fetchLocalSimStore,
  preferSim,
  readCachedSimStore,
  readSimStore,
  SIM_CACHE_KEY,
  SIM_EXPORT_CHANNEL,
  SIM_STORE_KEY,
  simKey,
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
  lastReporter: ReporterStore | null;
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
  importReporter: (store: ReporterStore) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

const META_KEY = "tective-ftod-sync-meta-v1";
const listeners = new Set<() => void>();
let memory: HubState = seedState;
let clientAttached = false;
let lastSim: SimStore | null = null;
let lastReporter: ReporterStore | null = SNAPSHOT_REPORTER;
let reporterLockedKey = "";
let simLockedKey = "";
let localUpdatedAt = "";
let publishTimer: number | null = null;
let refreshing = false;
let pullingSim = false;

function skipHubPublish() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ftod-test");
}

function lockSim(store: SimStore) {
  const next = slimSimStore(store) ?? store;
  cacheSimStore(next);
  lastSim = next;
  simLockedKey = artifactKey(next);
}

function unlockSimIfPublished(remote: SimStore | null) {
  if (simLockedKey && artifactKey(remote) === simLockedKey) simLockedKey = "";
}

function liveSim(local: SimStore | null, remote: SimStore | null) {
  if (simLockedKey && lastSim && artifactKey(lastSim) === simLockedKey) {
    const merged = preferSim(lastSim, preferSim(local, remote));
    return merged ? { ...merged, artifacts: lastSim.artifacts ?? merged.artifacts } : lastSim;
  }
  return preferSim(local, remote ?? lastSim ?? readCachedSimStore());
}

function lockReporter(store: ReporterStore) {
  const next = slimReporterStore(store) ?? store;
  cacheReporterStore(next);
  lastReporter = next;
  reporterLockedKey = reporterKey(next);
}

function unlockReporterIfPublished(remote: ReporterStore | null) {
  if (reporterLockedKey && reporterKey(remote) === reporterLockedKey) reporterLockedKey = "";
}

function liveReporter(local: ReporterStore | null, remote: ReporterStore | null) {
  if (reporterLockedKey && lastReporter && reporterKey(lastReporter) === reporterLockedKey) {
    return lastReporter;
  }
  return preferReporter(local, remote ?? lastReporter);
}

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
    lastSim = preferSim(readSimStore(), readCachedSimStore());
    lastReporter = preferReporter(readReporterStore(), null);
    const persisted = applyReporterDraft(applySimLastRun(readPersisted(), lastSim), lastReporter);
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
    if (document.visibilityState === "visible") {
      void pullLiveSim();
      void refreshAll();
    }
  };
  window.addEventListener("focus", onVisible);
  window.addEventListener("online", onVisible);
  window.addEventListener("pageshow", onVisible);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("storage", (event) => {
    if (
      event.key === SIM_STORE_KEY ||
      event.key === SIM_CACHE_KEY ||
      event.key === REPORTER_STORE_KEY ||
      event.key === REPORTER_CACHE_KEY ||
      event.key === STORAGE_KEY
    ) {
      void pullLiveSim();
      void refreshAll();
    }
  });
  listenSharedHardware((items) => {
    cacheHardware(items, false);
    write((current) => applyHardware(current, items), false);
  });
  try {
    const reporterChannel = new BroadcastChannel(REPORTER_EXPORT_CHANNEL);
    reporterChannel.addEventListener("message", (event) => {
      const store = asReporterStore(event.data);
      if (!store || isEmptyReporterDraft(store)) return;
      lockReporter(store);
      write((current) => applyReporterDraft(current, lastReporter));
    });
  } catch {
    /* BroadcastChannel is missing in some WebViews */
  }
  try {
    const simChannel = new BroadcastChannel(SIM_EXPORT_CHANNEL);
    simChannel.addEventListener("message", (event) => {
      const store = slimSimStore(asStore(event.data));
      if (!store || !artifactKey(store) || artifactKey(store) === artifactKey(lastSim)) return;
      applyLockedSim(store);
    });
  } catch {
    /* BroadcastChannel is missing in some WebViews */
  }
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    const local = readReporterStore();
    if (!local || reporterKey(local) === reporterKey(lastReporter)) return;
    if (reporterLockedKey && reporterKey(lastReporter) === reporterLockedKey) return;
    lastReporter = preferReporter(local, lastReporter);
    cacheReporterStore(lastReporter);
    write((current) => applyReporterDraft(current, lastReporter));
  }, 1000);
  window.setInterval(() => {
    if (document.visibilityState === "visible") void pullLiveSim();
  }, 1000);
  window.setInterval(() => {
    if (document.visibilityState === "visible") void refreshAll();
  }, 4000);
}

function applyLockedSim(store: SimStore) {
  lockSim(store);
  write((current) => applySimLastRun(current, lastSim), false);
  if (!skipHubPublish()) void publishSimExport(store);
}

async function pullLiveSim() {
  if (pullingSim) return;
  pullingSim = true;
  try {
    const apiSim = slimSimStore(await fetchLocalSimStore().catch(() => null));
    const storageSim = slimSimStore(readSimStore()) ?? readCachedSimStore();
    let next = liveSim(apiSim ?? storageSim, lastSim);
    if (!apiSim) {
      const remote = await fetchHubSync().catch(() => null);
      unlockSimIfPublished(remote?.sim ?? null);
      next = liveSim(storageSim, remote?.sim ?? lastSim);
    } else if (artifactKey(apiSim) && artifactKey(apiSim) !== artifactKey(lastSim)) {
      applyLockedSim(apiSim);
      return;
    }
    if (!next) return;
    if (simKey(next) === simKey(lastSim) && artifactKey(next) === artifactKey(lastSim)) return;
    if (artifactKey(next) && artifactKey(next) !== artifactKey(lastSim)) {
      applyLockedSim(next);
      return;
    }
    lastSim = next;
    cacheSimStore(next);
    write((current) => applySimLastRun(current, next), false);
  } finally {
    pullingSim = false;
  }
}

async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  try {
    const storageSim = slimSimStore(readSimStore()) ?? readCachedSimStore();
    const localReporter = readReporterStore();
    cacheReporterStore(localReporter);
    const localApiSimPromise = fetchLocalSimStore().catch(() => null);
    const restPromise = Promise.all([
      fetchUpcomingEntries().catch(() => null),
      fetchHardwareItems().catch(() => readSharedHardware()?.items ?? null),
      fetchHubSync().catch(() => null),
    ]);
    const localApiSim = slimSimStore(await localApiSimPromise);
    if (localApiSim && artifactKey(localApiSim) && artifactKey(localApiSim) !== artifactKey(lastSim)) {
      applyLockedSim(localApiSim);
    }
    const earlySim = liveSim(localApiSim ?? storageSim, lastSim);
    if (simKey(earlySim) !== simKey(lastSim)) {
      lastSim = earlySim;
      cacheSimStore(earlySim);
      write((current) => applySimLastRun(current, earlySim), false);
    }
    const [upcoming, hardware, remote] = await restPromise;
    unlockSimIfPublished(remote?.sim ?? null);
    const chosenSim = liveSim(localApiSim ?? earlySim, remote?.sim ?? null);
    unlockReporterIfPublished(remote?.reporter ?? null);
    const chosenReporter = liveReporter(localReporter, remote?.reporter ?? lastReporter);
    cacheReporterStore(chosenReporter);
    cacheSimStore(chosenSim);
    lastSim = chosenSim;
    lastReporter = chosenReporter;
    const remoteHubNewer = Boolean(remote?.updatedAt && remote.updatedAt > (localUpdatedAt || ""));
    write((current) => {
      let next = current;
      if (upcoming) next = { ...next, plan: planFromUpcoming(upcoming, next.plan) };
      if (remoteHubNewer) next = applyRemoteHub(next, remote?.hub ?? null);
      next = applySimLastRun(next, chosenSim);
      next = applyReporterDraft(next, chosenReporter);
      if (hardware) next = applyHardware(next, hardware);
      return next;
    }, false);
    if (remoteHubNewer && remote?.updatedAt) {
      localUpdatedAt = remote.updatedAt;
      persist(memory);
    }
    const lockedNeedsPublish = Boolean(
      reporterLockedKey && reporterKey(remote?.reporter ?? null) !== reporterLockedKey
    );
    const simNeedsPublish = Boolean(simLockedKey && artifactKey(remote?.sim ?? null) !== simLockedKey);
    if (
      !skipHubPublish() &&
      (lockedNeedsPublish || simNeedsPublish || shouldPublish(localUpdatedAt, chosenSim, remote, chosenReporter))
    ) {
      schedulePublish(remote);
    }
  } finally {
    refreshing = false;
  }
}

function schedulePublish(remote?: HubSyncPayload | null) {
  if (typeof window === "undefined" || skipHubPublish()) return;
  if (publishTimer) window.clearTimeout(publishTimer);
  publishTimer = window.setTimeout(() => {
    publishTimer = null;
    void pushShared(remote);
  }, 800);
}

async function pushShared(knownRemote?: HubSyncPayload | null) {
  if (!navigator.onLine || skipHubPublish()) return;
  try {
    const remote = knownRemote === undefined ? await fetchHubSync().catch(() => null) : knownRemote;
    const apiSim = slimSimStore(await fetchLocalSimStore().catch(() => null));
    const deviceSim = liveSim(apiSim ?? readSimStore(), lastSim);
    const sim = liveSim(deviceSim, remote?.sim ?? null);
    unlockSimIfPublished(remote?.sim ?? null);
    unlockReporterIfPublished(remote?.reporter ?? null);
    const deviceReporter = liveReporter(readReporterStore(), lastReporter);
    const reporter = liveReporter(deviceReporter, remote?.reporter ?? lastReporter);
    cacheReporterStore(reporter);
    cacheSimStore(sim);
    lastSim = sim;
    lastReporter = reporter;
    const lockedNeedsPublish = Boolean(
      reporterLockedKey && reporterKey(remote?.reporter ?? null) !== reporterLockedKey
    );
    const simNeedsPublish = Boolean(simLockedKey && artifactKey(remote?.sim ?? null) !== simLockedKey);
    if (!lockedNeedsPublish && !simNeedsPublish && !shouldPublish(localUpdatedAt, deviceSim, remote, deviceReporter)) {
      return;
    }
    const updatedAt = localUpdatedAt || new Date().toISOString();
    localUpdatedAt = updatedAt;
    await publishHubSync(snapshotForSync(memory, sim, reporter, updatedAt));
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
  const reporter = lastReporter;

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

  const importReporter = useCallback((store: ReporterStore) => {
    if (isEmptyReporterDraft(store)) return;
    lockReporter(store);
    try {
      new BroadcastChannel(REPORTER_EXPORT_CHANNEL).postMessage(lastReporter);
    } catch {
      /* same-tab import still writes the hub */
    }
    write((current) => applyReporterDraft(current, lastReporter));
  }, []);

  const reset = useCallback(() => {
    localUpdatedAt = "";
    lastSim = preferSim(readSimStore(), readCachedSimStore());
    lastReporter = preferReporter(readReporterStore(), null);
    memory = applyHardware(
      applyReporterDraft(applySimLastRun(cloneSeed(), lastSim), lastReporter),
      starterHardware()
    );
    persist(memory);
    emit();
    void refreshAll();
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      lastSim: sim,
      lastReporter: reporter,
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
      importReporter,
      reset,
    }),
    [
      ready,
      state,
      sim,
      reporter,
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
      importReporter,
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
