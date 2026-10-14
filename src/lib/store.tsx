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
import { STORAGE_KEY, cloneSeed, seedState } from "@/lib/seed";
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
  reset: () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

const listeners = new Set<() => void>();
let memory: HubState = seedState;
let clientAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function persist(state: HubState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readPersisted(): HubState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as HubState;
    if (!parsed?.drones?.length || !parsed.testCases?.length) return cloneSeed();
    return parsed;
  } catch {
    return cloneSeed();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!clientAttached) {
    clientAttached = true;
    memory = readPersisted();
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return seedState;
}

function write(updater: (current: HubState) => HubState) {
  memory = updater(memory);
  persist(memory);
  emit();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = state !== seedState || clientAttached;

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

  const reset = useCallback(() => {
    memory = cloneSeed();
    persist(memory);
    emit();
  }, []);

  const value = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      setDecision,
      setPlanStatus,
      setRunResult,
      addRun,
      setDroneStatus,
      setIssueStatus,
      addIssue,
      toggleCheck,
      addEvidence,
      reset,
    }),
    [
      ready,
      state,
      setDecision,
      setPlanStatus,
      setRunResult,
      addRun,
      setDroneStatus,
      setIssueStatus,
      addIssue,
      toggleCheck,
      addEvidence,
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
