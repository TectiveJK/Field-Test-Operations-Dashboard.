export const FLIGHT_RESULTS = [
  "Pending",
  "Pass",
  "Pass with observations",
  "Fail",
  "Aborted",
] as const;

export type FlightResult = (typeof FLIGHT_RESULTS)[number];

export const FLIGHT_PHASES = [
  "Scheduled",
  "Pre-flight",
  "Airborne",
  "Landed",
  "Debrief",
] as const;

export type FlightPhase = (typeof FLIGHT_PHASES)[number];

export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ["OPEN", "IN PROGRESS", "RESOLVED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ASSET_STATUSES = [
  "Ready",
  "In use",
  "Hold",
  "Down",
  "Inspection due",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const BATTERY_HEALTH = ["Good", "Watch", "Replace"] as const;
export type BatteryHealth = (typeof BATTERY_HEALTH)[number];

export type GoDecision = "GO" | "NO-GO" | "CONDITIONAL";

export type Campaign = {
  id: string;
  date: string;
  site: string;
  objectiveType1: string;
  objectiveType2: string;
  objective: string;
  responsible: string;
  roboticsSoftware: string;
  uavCategory: string;
  weather: string;
  windMs: number;
  temperatureC: number;
  visibilityKm: number;
  overallResult: FlightResult | "PASS WITH OBSERVATIONS";
  decision: GoDecision;
  decisionReason: string;
};

export type Aircraft = {
  id: string;
  name: string;
  type: "Airframe" | "Ground" | "Battery";
  category: string;
  status: AssetStatus;
  firmware?: string;
  hours?: number;
  notes: string;
};

export type Battery = {
  id: string;
  label: string;
  assignedTo: string | null;
  cycles: number;
  voltage: string;
  health: BatteryHealth;
  notes: string;
};

export type Flight = {
  id: string;
  campaignId: string;
  number: string;
  aircraftId: string;
  batteryId: string | null;
  start: string;
  duration: string;
  objective: string;
  modes: string[];
  phase: FlightPhase;
  result: FlightResult;
  mission: string;
  anomalies: string;
  action: string;
  logFile: string | null;
  captureFile: string | null;
};

export type Issue = {
  id: string;
  createdAt: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  aircraftId: string | null;
  flightId: string | null;
  source: "Flight" | "Inspection" | "Maintenance" | "Ops";
  description: string;
  action: string;
};

export type OpsState = {
  campaigns: Campaign[];
  aircraft: Aircraft[];
  batteries: Battery[];
  flights: Flight[];
  issues: Issue[];
  activeCampaignId: string;
};
