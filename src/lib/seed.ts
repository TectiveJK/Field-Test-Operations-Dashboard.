import { buildHubState } from "@/lib/from-apps";
import type { HubState } from "@/lib/types";

export { EXISTING_APPS } from "@/lib/from-apps";

export const STORAGE_KEY = "tective-ftod-hub-v2";

export const seedState: HubState = buildHubState();

export function cloneSeed(): HubState {
  return structuredClone(seedState);
}
