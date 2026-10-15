import type { PlanItem } from "@/lib/types";
import snapshot from "@/lib/upcoming-snapshot.json";

export const UPCOMING_BOARD_URL =
  "https://extendsclass.com/api/json-storage/bin/defbaaf";

export const UPCOMING_APP_URL = "https://tectivejk.github.io/Upcoming-Test-Flights/";

const WRITE_PROXY = "https://cors.jimmywarting.deno.net/";

export type UpcomingKind = "flight" | "test";

export type UpcomingEntry = {
  id: string;
  kind: UpcomingKind;
  title: string;
  date: string;
  time: string;
  owner: string;
  notes: string;
  example: boolean;
  createdAt: string;
};

export type UpcomingInput = {
  kind: UpcomingKind;
  title: string;
  date: string;
  time: string;
  owner: string;
  notes: string;
};

type UpcomingBoard = {
  entries: UpcomingEntry[];
  version: number;
};

function asEntry(raw: unknown): UpcomingEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<UpcomingEntry>;
  if (
    typeof item.id !== "string" ||
    (item.kind !== "flight" && item.kind !== "test") ||
    typeof item.title !== "string" ||
    typeof item.date !== "string" ||
    typeof item.time !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    date: item.date,
    time: item.time,
    owner: typeof item.owner === "string" ? item.owner : "",
    notes: typeof item.notes === "string" ? item.notes : "",
    example: item.example === true,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
  };
}

export function entriesFromBoard(raw: unknown): UpcomingEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(items)) return [];
  return items.map(asEntry).filter((entry): entry is UpcomingEntry => entry !== null);
}

export function listedEntries(entries: UpcomingEntry[]) {
  return entries.filter((entry) => entry.example !== true);
}

export const SNAPSHOT_ENTRIES = listedEntries(entriesFromBoard(snapshot));

export function planFromUpcoming(
  entries: UpcomingEntry[],
  previous: PlanItem[] = []
): PlanItem[] {
  const prior = new Map(previous.map((item) => [item.id, item]));
  return listedEntries(entries).map((entry) => {
    const existing = prior.get(entry.id);
    return {
      id: entry.id,
      date: entry.date,
      testCaseId: null,
      droneId: null,
      status: existing?.status ?? "Planned",
      window: entry.time,
      notes: entry.notes,
      owner: entry.owner,
      title: entry.title,
      kind: entry.kind,
    };
  });
}

function boardFromRaw(raw: unknown): UpcomingBoard {
  const version =
    raw && typeof raw === "object" && typeof (raw as { version?: unknown }).version === "number"
      ? (raw as { version: number }).version
      : 0;
  return { entries: entriesFromBoard(raw), version };
}

export async function fetchUpcomingBoard(): Promise<UpcomingBoard> {
  const response = await fetch(`${UPCOMING_BOARD_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Upcoming flights board could not be loaded.");
  return boardFromRaw(await response.json());
}

export async function fetchUpcomingEntries(): Promise<UpcomingEntry[]> {
  return listedEntries((await fetchUpcomingBoard()).entries);
}

function writeUrl(url: string) {
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

async function writeBoard(body: string) {
  const targets = typeof window === "undefined" ? [UPCOMING_BOARD_URL] : [writeUrl(UPCOMING_BOARD_URL), UPCOMING_BOARD_URL];
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
      lastError = new Error("The Upcoming flights board could not be saved.");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("The Upcoming flights board could not be saved.");
    }
  }
  throw lastError ?? new Error("The Upcoming flights board could not be saved.");
}

async function mutateUpcoming(change: (entries: UpcomingEntry[]) => UpcomingEntry[]) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const current = await fetchUpcomingBoard();
      const entries = change(current.entries.map((entry) => ({ ...entry })));
      await writeBoard(JSON.stringify({ entries, version: current.version + 1 }));
      return listedEntries(entries);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("The Upcoming flights board could not be saved.");
    }
  }
  throw lastError ?? new Error("The Upcoming flights board could not be saved.");
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function validateUpcomingInput(
  input: Partial<UpcomingInput>
): { ok: true; value: UpcomingInput } | { ok: false; error: string } {
  if (input.kind !== "flight" && input.kind !== "test") {
    return { ok: false, error: "Choose Flight or Test." };
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Add a name for the flight or test." };
  if (title.length > 80) return { ok: false, error: "Keep the name under 80 characters." };
  const date = typeof input.date === "string" ? input.date : "";
  if (!isValidDate(date)) return { ok: false, error: "Choose a valid date." };
  const year = Number(date.slice(0, 4));
  const thisYear = new Date().getFullYear();
  if (year < thisYear - 1 || year > thisYear + 3) {
    return { ok: false, error: "Choose a date within the next few years." };
  }
  const time = typeof input.time === "string" ? input.time.slice(0, 5) : "";
  if (!isValidTime(time)) return { ok: false, error: "Choose a valid time." };
  const owner = typeof input.owner === "string" ? input.owner.trim() : "";
  if (owner.length > 60) return { ok: false, error: "Keep the owner name under 60 characters." };
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 240) return { ok: false, error: "Keep the note under 240 characters." };
  return { ok: true, value: { kind: input.kind, title, date, time, owner, notes } };
}

export async function addUpcomingEntry(input: UpcomingInput): Promise<UpcomingEntry[]> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  return mutateUpcoming((entries) => [
    ...entries,
    { ...input, id, example: false, createdAt },
  ]);
}

export async function updateUpcomingEntry(id: string, input: UpcomingInput): Promise<UpcomingEntry[]> {
  return mutateUpcoming((entries) => {
    const index = entries.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("That flight or test is no longer on the board.");
    const current = entries[index];
    const next = [...entries];
    next[index] = { ...current, ...input, id: current.id, example: current.example, createdAt: current.createdAt };
    return next;
  });
}

export async function removeUpcomingEntry(id: string): Promise<UpcomingEntry[]> {
  return mutateUpcoming((entries) => {
    const next = entries.filter((entry) => entry.id !== id);
    if (next.length === entries.length) throw new Error("That flight or test is no longer on the board.");
    return next;
  });
}
