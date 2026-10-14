import snapshot from "@/lib/hardware-snapshot.json";
import { isAirframe, type ChecklistItem, type Drone, type HubState } from "@/lib/types";

export const HARDWARE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz3KiLyly5nRN7-y9iyJvL-z6xLpJKtNH02faJ4NeH1j0BvYUhlbvUVOXqckLtIIGqcuw/exec";

export const HARDWARE_APP_URL = "https://tectivejk.github.io/Updating-hardware/";

export const HARDWARE_LOCATIONS = [
  "In factory downstairs",
  "In office upstairs",
  "In hive",
  "testing",
  "Out of service",
] as const;

export function isPresetLocation(value: string) {
  return (HARDWARE_LOCATIONS as readonly string[]).includes(value);
}

export type HardwareItem = {
  name: string;
  location: string;
  gimbal: string;
  person: string;
  note: string;
  type: string;
};

export function itemsFromHardware(raw: unknown): HardwareItem[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items
    .map((entry): HardwareItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Partial<HardwareItem>;
      const name = String(item.name ?? "").trim();
      const location = String(item.location ?? "").trim();
      if (!name || location.toLowerCase() === "deleted") return null;
      return {
        name,
        location,
        gimbal: String(item.gimbal ?? "").trim(),
        person: String(item.person ?? "").trim(),
        note: String(item.note ?? "").trim(),
        type: String(item.type ?? classify(name)),
      };
    })
    .filter((item): item is HardwareItem => item !== null);
}

export const SNAPSHOT_HARDWARE = itemsFromHardware(snapshot);

export function normalizeHardwareName(name: string) {
  return name
    .toLowerCase()
    .replaceAll(/\s*\([^)]*\)/g, " ")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findHardware(items: HardwareItem[], name: string) {
  const needle = normalizeHardwareName(name);
  if (!needle) return null;
  return items.find((item) => normalizeHardwareName(item.name) === needle) ?? null;
}

type HardwareEnvelope = {
  ok?: boolean;
  error?: string;
  items?: unknown;
  item?: unknown;
};

function parseHardwareEnvelope(raw: string): HardwareEnvelope {
  const trimmed = raw.trim();
  const wrapped = trimmed.match(/^[a-zA-Z_$][\w.]*\(([\s\S]*)\)\s*;?\s*$/);
  const jsonText = wrapped ? wrapped[1] : trimmed;
  const data = JSON.parse(jsonText) as HardwareEnvelope;
  if (!data || typeof data !== "object") return {};
  return data;
}

export function parseHardwarePayload(raw: string): HardwareItem[] {
  return itemsFromHardware(parseHardwareEnvelope(raw));
}

let lastHardware: HardwareItem[] = SNAPSHOT_HARDWARE;

function rememberHardware(items: HardwareItem[]) {
  lastHardware = items;
}

function upsertRemembered(item: HardwareItem) {
  const needle = normalizeHardwareName(item.name);
  lastHardware = [item, ...lastHardware.filter((entry) => normalizeHardwareName(entry.name) !== needle)];
  return lastHardware;
}

function hardwareJsonp(action: string, params: Record<string, string>): Promise<HardwareEnvelope> {
  return new Promise((resolve, reject) => {
    const callback = `hwcb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const query = new URLSearchParams({ action, callback, t: String(Date.now()), ...params });
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out talking to the company hardware list."));
    }, 20000);
    function cleanup() {
      window.clearTimeout(timer);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
    }
    (window as unknown as Record<string, unknown>)[callback] = (data: HardwareEnvelope) => {
      cleanup();
      resolve(data && typeof data === "object" ? data : {});
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Could not reach the company hardware list."));
    };
    script.async = true;
    script.src = `${HARDWARE_SCRIPT_URL}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

async function hardwareRequest(action: string, params: Record<string, string> = {}): Promise<HardwareEnvelope> {
  try {
    const query = new URLSearchParams({ action, t: String(Date.now()), ...params });
    const response = await fetch(`${HARDWARE_SCRIPT_URL}?${query.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Hardware locator could not be reached.");
    return parseHardwareEnvelope(await response.text());
  } catch (error) {
    if (typeof document === "undefined") throw error;
    return hardwareJsonp(action, params);
  }
}

export async function fetchHardwareItems(): Promise<HardwareItem[]> {
  const data = await hardwareRequest("list");
  if (data.ok === false) throw new Error(data.error || "Hardware locator list could not be loaded.");
  const items = itemsFromHardware(data);
  rememberHardware(items);
  return items;
}

function itemFromUnknown(raw: unknown, fallback: HardwareItem): HardwareItem {
  const parsed = itemsFromHardware({ items: raw ? [raw] : [] })[0];
  return parsed ?? fallback;
}

export async function updateHardware(input: {
  item: string;
  location: string;
  person: string;
  note: string;
}): Promise<HardwareItem[]> {
  const data = await hardwareRequest("update", {
    item: input.item,
    newName: "",
    location: input.location,
    person: input.person,
    note: input.note,
  });
  if (data.ok === false) throw new Error(data.error || "Could not update hardware location.");
  const saved = itemFromUnknown(data.item, {
    name: input.item,
    location: input.location,
    person: input.person,
    note: input.note,
    gimbal: findHardware(lastHardware, input.item)?.gimbal ?? "",
    type: findHardware(lastHardware, input.item)?.type ?? "",
  });
  return upsertRemembered(saved);
}

export async function addHardware(input: {
  name: string;
  location: string;
  person: string;
  note: string;
}): Promise<HardwareItem[]> {
  const data = await hardwareRequest("add", {
    item: input.name,
    location: input.location,
    person: input.person,
    note: input.note,
  });
  if (data.ok === false) throw new Error(data.error || "Could not add hardware.");
  const saved = itemFromUnknown(data.item, {
    name: input.name,
    location: input.location,
    person: input.person,
    note: input.note,
    gimbal: "",
    type: classify(input.name),
  });
  return upsertRemembered(saved);
}

function classify(name: string) {
  const n = name.toLowerCase();
  if (n.includes("battery")) return "battery";
  if (n.includes("rotator")) return "rotator";
  if (n.includes("hive") || n.includes("skyfence")) return "hive";
  if (n.includes("refly") || n.includes("drone") || n.includes("ibb")) return "drone";
  return "other";
}

function familyOf(name: string): Drone["family"] {
  const lower = name.toLowerCase();
  if (lower.includes("battery")) return "Battery";
  if (lower.includes("ibb")) return "ReFly IBB";
  if (lower.includes("skyhive") || lower.includes("hive")) return "SkyHive SF";
  if (lower.includes("rotator")) return "Ground";
  return "ReFly SF";
}

function slug(name: string) {
  return name.toLowerCase().replaceAll(" ", "-");
}

function statusFromLocation(location: string, current: Drone["status"]): Drone["status"] {
  if (location.trim().toLowerCase() === "out of service") return "Grounded";
  if (current === "Grounded" && location.trim()) return "Available";
  return current;
}

function hardwareNotes(item: HardwareItem) {
  return item.note.trim();
}

function checklistGroup(type: string, name: string) {
  if (type === "battery" || name.toLowerCase().includes("battery")) return "Batteries";
  if (type === "rotator" || name.toLowerCase().includes("rotator")) return "Ground";
  return "Aircraft";
}

export function applyHardware(hub: HubState, items: HardwareItem[]): HubState {
  if (!items.length) return hub;

  const drones = hub.drones.map((drone) => {
    const item = findHardware(items, drone.name);
    if (!item) {
      return {
        ...drone,
        location: drone.location ?? "",
        holder: drone.holder ?? "",
        gimbal: drone.gimbal ?? "",
        locatorNote: drone.locatorNote ?? "",
      };
    }
    return {
      ...drone,
      location: item.location,
      holder: item.person,
      gimbal: item.gimbal,
      locatorNote: item.note,
      notes: hardwareNotes(item),
      status: isAirframe(drone) ? statusFromLocation(item.location, drone.status) : drone.status,
    };
  });

  const known = new Set(drones.map((drone) => normalizeHardwareName(drone.name)));
  const extras: Drone[] = [];
  for (const item of items) {
    if (known.has(normalizeHardwareName(item.name))) continue;
    const family = familyOf(item.name);
    extras.push({
      id: slug(item.name),
      name: item.name,
      family,
      status: isAirframe({ family }) ? statusFromLocation(item.location, "Available") : "Available",
      buildId: isAirframe({ family }) ? (hub.builds[0]?.id ?? "") : "",
      hardware: item.name,
      parameters: "",
      hours: 0,
      notes: hardwareNotes(item),
      location: item.location,
      holder: item.person,
      gimbal: item.gimbal,
      locatorNote: item.note,
    });
    known.add(normalizeHardwareName(item.name));
  }

  const checklist = hub.checklist.map((row) => {
    const item = findHardware(items, row.label);
    if (!item) {
      return { ...row, location: row.location ?? "", holder: row.holder ?? "", locatorNote: row.locatorNote ?? "" };
    }
    return { ...row, location: item.location, holder: item.person, locatorNote: item.note };
  });

  const listed = new Set(checklist.map((row) => normalizeHardwareName(row.label)));
  const extraChecks: ChecklistItem[] = [];
  for (const item of items) {
    if (listed.has(normalizeHardwareName(item.name))) continue;
    extraChecks.push({
      id: `loc-${slug(item.name)}`,
      group: checklistGroup(item.type, item.name),
      label: item.name,
      done: false,
      by: "",
      at: null,
      location: item.location,
      holder: item.person,
      locatorNote: item.note,
    });
  }

  return {
    ...hub,
    drones: [...drones, ...extras],
    checklist: [...checklist, ...extraChecks],
  };
}
