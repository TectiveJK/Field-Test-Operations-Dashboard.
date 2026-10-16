export const DRONE_STATUSES = ["Available", "Under test", "Grounded"] as const;
export type DroneStatus = (typeof DRONE_STATUSES)[number];

export const RUN_RESULTS = [
  "Not run",
  "Pass",
  "Pass with observations",
  "Fail",
  "Blocked",
  "Aborted",
] as const;
export type RunResult = (typeof RUN_RESULTS)[number];

export const RUN_ENVIRONMENTS = ["Field", "Simulator"] as const;
export type RunEnvironment = (typeof RUN_ENVIRONMENTS)[number];

export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = [
  "OPEN",
  "IN PROGRESS",
  "READY FOR RETEST",
  "RESOLVED",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const PLAN_STATUSES = ["Planned", "In progress", "Done", "Skipped"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const EVIDENCE_KINDS = [
  "ULog",
  "QGC screenshot",
  "Wireshark",
  "Video",
  "Photo",
  "Note",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const GO_DECISIONS = ["GO", "CONDITIONAL", "NO-GO"] as const;
export type GoDecision = (typeof GO_DECISIONS)[number];

export type SoftwareBuild = {
  id: string;
  label: string;
  jenkins: string;
  px4: string;
  skyCommand: string;
  skyHive: string;
  gcs: string;
  autonomyNode: string;
  notes: string;
};

export type DroneFamily = "ReFly IBB" | "ReFly SF" | "SkyHive SF" | "Ground" | "Battery";

export type Drone = {
  id: string;
  name: string;
  family: DroneFamily;
  status: DroneStatus;
  buildId: string;
  hardware: string;
  parameters: string;
  hours: number;
  notes: string;
  location: string;
  holder: string;
  gimbal: string;
  locatorNote: string;
};

export function isAirframe(drone: Pick<Drone, "family">) {
  return drone.family !== "Ground" && drone.family !== "Battery";
}

export type TestCase = {
  id: string;
  code: string;
  name: string;
  missionType: string;
  environment: RunEnvironment | "Both";
  steps: string[];
  expected: string;
};

export type TestRun = {
  id: string;
  testCaseId: string;
  droneId: string;
  buildId: string;
  startedAt: string;
  environment: RunEnvironment;
  result: RunResult;
  duration: string;
  notes: string;
  measurements: string;
  issueIds: string[];
  evidenceIds: string[];
  reportId: string | null;
};

export type Issue = {
  id: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  droneId: string | null;
  buildId: string | null;
  testRunId: string | null;
  missionType: string;
  environment: RunEnvironment | "Both";
  stepsToReproduce: string;
  expected: string;
  actual: string;
  assignee: string;
  retestResult: string;
  createdAt: string;
};

export type FlightReport = {
  id: string;
  title: string;
  date: string;
  droneIds: string[];
  runIds: string[];
  summary: string;
  overall: RunResult;
};

export type Evidence = {
  id: string;
  kind: EvidenceKind;
  filename: string;
  droneId: string | null;
  testRunId: string | null;
  issueId: string | null;
  buildId: string | null;
  notes: string;
};

export type PlanItem = {
  id: string;
  date: string;
  testCaseId: string | null;
  droneId: string | null;
  status: PlanStatus;
  window: string;
  notes: string;
  owner: string;
  title: string;
  kind: "flight" | "test";
};

export type ChecklistItem = {
  id: string;
  group: string;
  label: string;
  done: boolean;
  by: string;
  at: string | null;
  location: string;
  holder: string;
  locatorNote: string;
};

export type KnowledgeNote = {
  id: string;
  title: string;
  tags: string[];
  body: string;
  relatedIssueId: string | null;
};

export type HubState = {
  site: string;
  decision: GoDecision;
  decisionReason: string;
  weather: string;
  operator: string;
  builds: SoftwareBuild[];
  drones: Drone[];
  testCases: TestCase[];
  runs: TestRun[];
  issues: Issue[];
  reports: FlightReport[];
  evidence: Evidence[];
  plan: PlanItem[];
  checklist: ChecklistItem[];
  knowledge: KnowledgeNote[];
};

export type NextAction = {
  title: string;
  why: string;
  href: string;
  priority: "now" | "next" | "blocked";
  planId?: string;
};
