import { applyHardware, SNAPSHOT_HARDWARE } from "@/lib/hardware";
import { applyReporterDraft, SNAPSHOT_REPORTER } from "@/lib/reporter-import";
import { SNAPSHOT_ENTRIES, planFromUpcoming } from "@/lib/upcoming";
import { SIM_APP_URL } from "@/lib/sim-import";
import { SUITE } from "@/lib/sim-suite";
import { isAirframe, type ChecklistItem, type Drone, type HubState, type SoftwareBuild, type TestCase } from "@/lib/types";

/** Equipment names from Drone Flight Test Reporter (ios-app equipment list). */
export const REPORTER_EQUIPMENT = [
  "refly-ibb-010",
  "refly-ibb-015",
  "refly-ibb-007",
  "skyhive-sf-004",
  "refly-sf-007",
  "refly-sf-010",
  "refly-sf-031",
  "refly-sf-032",
  "refly-sf-033",
  "rotator 25",
  "battery 96",
  "battery 63",
  "battery 3",
  "battery 39",
  "battery 99",
  "battery 97",
  "battery 118",
  "battery 82",
  "battery 93",
  "battery 86",
  "battery 43",
  "battery 17",
  "battery 62",
  "Battery 12",
  "Battery 107",
] as const;

const AIRFRAMES = REPORTER_EQUIPMENT.filter((name) => !name.toLowerCase().includes("battery"));
const BATTERIES = REPORTER_EQUIPMENT.filter((name) => name.toLowerCase().includes("battery"));

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

export const EXISTING_APPS = [
  {
    name: "Flight Test Reporter",
    area: "Reporting",
    href: "https://tectivejk.github.io/drone-flight-test-reporter/",
    note: "Multi-flight field reports. The latest saved report is copied onto this hub (laptop same-origin store, then shared with the iPhone).",
  },
  {
    name: "Maintenance Assistant",
    area: "Maintenance",
    href: "https://tectivejk.github.io/drone-maintenance-assistant/",
    note: "Inspections, batteries, faults. No fleet records are stored in that app yet.",
  },
  {
    name: "Upcoming flights & tests",
    area: "Planning",
    href: "https://tectivejk.github.io/Upcoming-Test-Flights/",
    note: "Shared board for the next sorties. Add, edit or remove flights and tests on Plan; that same board updates.",
  },
  {
    name: "SIM Flight Testing",
    area: "Simulator testing",
    href: SIM_APP_URL,
    note: "Gitea SIM app on this computer (20 SkyCommand simulator missions). Scored runs, FAIL / BLOCKED items, and .deb names are copied onto this hub and shared with other devices.",
  },
  {
    name: "Hardware locator",
    area: "Locations",
    href: "https://tectivejk.github.io/Updating-hardware/",
    note: "Live company list of where each airframe, pack, hive and rotator is. Change a location here or there; both apps update.",
  },
] as const;

const simBuild: SoftwareBuild = {
  id: "sim-b9c924f",
  label: "SIM Flight Testing packages",
  jenkins: "",
  px4: "",
  skyCommand: "web-ground-control_0.0.1-b9c924f.deb",
  skyHive: "",
  gcs: "mission-planner_1.0.0+b9c924f-b29_amd64.deb",
  autonomyNode: "tective-simulator_0.1.0+b9c924f.b29_amd64.deb",
  notes: "Default .deb artifacts from SIM Flight Testing.",
};

function dronesFromReporter(): Drone[] {
  return REPORTER_EQUIPMENT.map((name) => {
    const family = familyOf(name);
    return {
      id: slug(name),
      name,
      family,
      status: "Available" as const,
      buildId: isAirframe({ family }) ? simBuild.id : "",
      hardware: family === "Ground" ? "Tracking antenna rotator" : name,
      parameters: "",
      hours: 0,
      notes: "Listed in Drone Flight Test Reporter equipment.",
      location: "",
      holder: "",
      gimbal: "",
      locatorNote: "",
    };
  });
}

function testsFromSim(): TestCase[] {
  return SUITE.map((mission, index) => ({
    id: mission.id,
    code: `SIM-${String(index + 1).padStart(2, "0")}`,
    name: mission.name,
    missionType: mission.category,
    environment: "Simulator" as const,
    steps: mission.steps.map((step) => `${step.label}: ${step.instruction}`),
    expected: mission.expectedBehavior,
  }));
}

function checklistFromReporter(): ChecklistItem[] {
  const aircraft = AIRFRAMES.filter((name) => !name.toLowerCase().includes("rotator")).map(
    (name, index) => ({
      id: `air-${index + 1}`,
      group: "Aircraft",
      label: name,
      done: false,
      by: "",
      at: null,
      location: "",
      holder: "",
      locatorNote: "",
    })
  );
  const batteries = BATTERIES.map((name, index) => ({
    id: `bat-${index + 1}`,
    group: "Batteries",
    label: name,
    done: false,
    by: "",
    at: null,
    location: "",
    holder: "",
    locatorNote: "",
  }));
  const ground: ChecklistItem[] = [
    { id: "g1", group: "Ground", label: "rotator 25", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
    { id: "g2", group: "Ground", label: "Hive + tracking antenna", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
    { id: "g3", group: "Ground", label: "Starlink + generator + fuel", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
  ];
  const gcs: ChecklistItem[] = [
    { id: "s1", group: "GCS", label: "QGC + joysticks + cables", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
    { id: "s2", group: "GCS", label: "SIM / GCS laptop", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
    { id: "s3", group: "GCS", label: "SIM packages (web-ground-control, mission-planner, tective-simulator)", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
  ];
  const site: ChecklistItem[] = [
    { id: "t1", group: "Site", label: "Weather, NOTAM, range brief", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
    { id: "t2", group: "Site", label: "Safety: observers, abort line, fire extinguisher", done: false, by: "", at: null, location: "", holder: "", locatorNote: "" },
  ];
  return [...aircraft, ...batteries, ...ground, ...gcs, ...site];
}

export function buildHubState(): HubState {
  return applyHardware(
    applyReporterDraft(
      {
        site: "Tective",
        decision: "GO",
        decisionReason: "",
        weather: "",
        operator: "John Kokotinis",
        builds: [simBuild],
        drones: dronesFromReporter(),
        testCases: testsFromSim(),
        runs: [],
        issues: [],
        reports: [],
        evidence: [],
        plan: planFromUpcoming(SNAPSHOT_ENTRIES),
        checklist: checklistFromReporter(),
        knowledge: [],
      },
      SNAPSHOT_REPORTER
    ),
    SNAPSHOT_HARDWARE
  );
}
