import snapshot from "@/lib/hardware-snapshot.json";
import type { ChecklistItem, Drone, HubState } from "@/lib/types";

export const HARDWARE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz3KiLyly5nRN7-y9iyJvL-z6xLpJKtNH02faJ4NeH1j0BvYUhlbvUVOXqckLtIIGqcuw/exec";

export const HARDWARE_APP_URL = "https://tectivejk.github.io/Updating-hardware/";

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

export function parseHardwarePayload(raw: string): HardwareItem[] {
  const trimmed = raw.trim();
  const wrapped = trimmed.match(/^[a-zA-Z_$][\w.]*\(([\s\S]*)\)\s*;?\s*$/);
  const jsonText = wrapped ? wrapped[1] : trimmed;
  return itemsFromHardware(JSON.parse(jsonText));
}

export async function fetchHardwareItems(): Promise<HardwareItem[]> {
  const response = await fetch(`${HARDWARE_SCRIPT_URL}?action=list&t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Hardware locator list could not be loaded.");
  return parseHardwarePayload(await response.text());
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

function hardwareNotes(item: HardwareItem, previous: string) {
  const parts = [item.note, item.gimbal ? `Gimbal ${item.gimbal}` : "", item.person ? `With ${item.person}` : ""].filter(
    Boolean
  );
  if (parts.length) return parts.join(". ");
  if (previous && !previous.startsWith("Listed in Drone Flight Test Reporter")) return previous;
  return previous || "Listed in Hardware locator.";
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
      };
    }
    return {
      ...drone,
      location: item.location,
      holder: item.person,
      gimbal: item.gimbal,
      notes: hardwareNotes(item, drone.notes),
      status: drone.family === "Ground" ? drone.status : statusFromLocation(item.location, drone.status),
    };
  });

  const known = new Set(drones.map((drone) => normalizeHardwareName(drone.name)));
  const extras: Drone[] = [];
  for (const item of items) {
    if (item.type === "battery" || item.name.toLowerCase().includes("battery")) continue;
    if (known.has(normalizeHardwareName(item.name))) continue;
    extras.push({
      id: slug(item.name),
      name: item.name,
      family: familyOf(item.name),
      status: statusFromLocation(item.location, "Available"),
      buildId: hub.builds[0]?.id ?? "",
      hardware: item.name,
      parameters: "",
      hours: 0,
      notes: hardwareNotes(item, ""),
      location: item.location,
      holder: item.person,
      gimbal: item.gimbal,
    });
    known.add(normalizeHardwareName(item.name));
  }

  const checklist = hub.checklist.map((row) => {
    const item = findHardware(items, row.label);
    if (!item) {
      return { ...row, location: row.location ?? "", holder: row.holder ?? "" };
    }
    return { ...row, location: item.location, holder: item.person };
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
    });
  }

  return {
    ...hub,
    drones: [...drones, ...extras],
    checklist: [...checklist, ...extraChecks],
  };
}
