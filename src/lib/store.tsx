"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { formatDate, newId } from "@/lib/format";
import { STORAGE_KEY, cloneSeed, seedState } from "@/lib/seed";
import type {
  FlightResult,
  GoDecision,
  Issue,
  IssueSeverity,
  OpsState,
} from "@/lib/types";

type StoreApi = {
  ready: boolean;
  state: OpsState;
  today: OpsState["campaigns"][number];
  todayFlights: OpsState["flights"];
  openIssues: OpsState["issues"];
  setDecision: (decision: GoDecision, reason: string) => void;
  setFlightResult: (flightId: string, result: FlightResult) => void;
  addIssue: (input: {
    title: string;
    severity: IssueSeverity;
    aircraftId: string | null;
    description: string;
    action: string;
  }) => void;
  setIssueStatus: (issueId: string, status: Issue["status"]) => void;
  reset: () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

const listeners = new Set<() => void>();
let memory: OpsState = seedState;
let clientAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function persist(state: OpsState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readPersisted(): OpsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const parsed = JSON.parse(raw) as OpsState;
    if (!parsed?.campaigns?.length || !parsed.activeCampaignId) return cloneSeed();
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

function write(updater: (current: OpsState) => OpsState) {
  memory = updater(memory);
  persist(memory);
  emit();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = state !== seedState || clientAttached;

  const setDecision = useCallback((decision: GoDecision, reason: string) => {
    write((current) => ({
      ...current,
      campaigns: current.campaigns.map((campaign) =>
        campaign.id === current.activeCampaignId
          ? { ...campaign, decision, decisionReason: reason }
          : campaign
      ),
    }));
  }, []);

  const setFlightResult = useCallback((flightId: string, result: FlightResult) => {
    write((current) => ({
      ...current,
      flights: current.flights.map((flight) =>
        flight.id === flightId
          ? {
              ...flight,
              result,
              phase:
                result === "Pending"
                  ? flight.phase
                  : flight.phase === "Airborne" || flight.phase === "Scheduled"
                    ? "Landed"
                    : flight.phase,
            }
          : flight
      ),
    }));
  }, []);

  const addIssue = useCallback(
    (input: {
      title: string;
      severity: IssueSeverity;
      aircraftId: string | null;
      description: string;
      action: string;
    }) => {
      write((current) => ({
        ...current,
        issues: [
          {
            id: newId("iss"),
            createdAt: new Date().toISOString(),
            title: input.title,
            severity: input.severity,
            status: "OPEN",
            aircraftId: input.aircraftId,
            flightId: null,
            source: "Ops",
            description: input.description,
            action: input.action,
          },
          ...current.issues,
        ],
      }));
    },
    []
  );

  const setIssueStatus = useCallback((issueId: string, status: Issue["status"]) => {
    write((current) => ({
      ...current,
      issues: current.issues.map((issue) =>
        issue.id === issueId ? { ...issue, status } : issue
      ),
    }));
  }, []);

  const reset = useCallback(() => {
    memory = cloneSeed();
    persist(memory);
    emit();
  }, []);

  const today = useMemo(
    () =>
      state.campaigns.find((campaign) => campaign.id === state.activeCampaignId) ??
      state.campaigns[0],
    [state]
  );

  const todayFlights = useMemo(
    () =>
      state.flights
        .filter((flight) => flight.campaignId === state.activeCampaignId)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [state]
  );

  const openIssues = useMemo(
    () => state.issues.filter((issue) => issue.status !== "RESOLVED"),
    [state.issues]
  );

  const value = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      today,
      todayFlights,
      openIssues,
      setDecision,
      setFlightResult,
      addIssue,
      setIssueStatus,
      reset,
    }),
    [
      ready,
      state,
      today,
      todayFlights,
      openIssues,
      setDecision,
      setFlightResult,
      addIssue,
      setIssueStatus,
      reset,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOps() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useOps must be used inside StoreProvider");
  return value;
}

export function campaignLabel(date: string, site: string) {
  return `${formatDate(date)} · ${site}`;
}
