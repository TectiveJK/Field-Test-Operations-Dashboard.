import type { PlanItem } from "@/lib/types";
import snapshot from "@/lib/upcoming-snapshot.json";

export const UPCOMING_BOARD_URL =
  "https://extendsclass.com/api/json-storage/bin/defbaaf";

export type UpcomingEntry = {
  id: string;
  kind: "flight" | "test";
  title: string;
  date: string;
  time: string;
  owner: string;
  notes: string;
  example: boolean;
  createdAt: string;
};

export function entriesFromBoard(raw: unknown): UpcomingEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry): entry is UpcomingEntry => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Partial<UpcomingEntry>;
    return (
      typeof item.id === "string" &&
      (item.kind === "flight" || item.kind === "test") &&
      typeof item.title === "string" &&
      typeof item.date === "string" &&
      typeof item.time === "string" &&
      item.example !== true
    );
  });
}

export const SNAPSHOT_ENTRIES = entriesFromBoard(snapshot);

export function planFromUpcoming(
  entries: UpcomingEntry[],
  previous: PlanItem[] = []
): PlanItem[] {
  const prior = new Map(previous.map((item) => [item.id, item]));
  return entries.map((entry) => {
    const existing = prior.get(entry.id);
    const extra = [entry.owner?.trim(), entry.notes?.trim()].filter(Boolean).join(" · ");
    return {
      id: entry.id,
      date: entry.date,
      testCaseId: null,
      droneId: null,
      status: existing?.status ?? "Planned",
      window: entry.time,
      notes: extra,
      title: entry.title,
      kind: entry.kind,
    };
  });
}

export async function fetchUpcomingEntries(): Promise<UpcomingEntry[]> {
  const response = await fetch(`${UPCOMING_BOARD_URL}?t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Upcoming flights board could not be loaded.");
  return entriesFromBoard(await response.json());
}
