import { formatClock, formatDate, formatTime, todayIso } from "@/lib/format";
import {
  activePlan,
  buildById,
  caseById,
  counts,
  dailySummary,
  droneById,
  nextActions,
  openIssues,
  planLabel,
  questionThreeIssues,
  questionThreePlan,
  skippedPlanCarryover,
  todayRuns,
  upcomingPlan,
} from "@/lib/selectors";
import { summarizeSim, type SimStore } from "@/lib/sim-import";
import { isAirframe, type Drone, type HubState } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";
import { buildPdf, downloadPdf, type PdfSection } from "@/lib/pdf";
import { readWeatherCache, weatherLine } from "@/lib/weather";

export type ExportPage = "today" | "plan" | "tests" | "fleet" | "issues" | "deploy" | "reports";

const FLEET_SECTIONS = ["Aircraft", "Hive", "Rotator", "Batteries"] as const;
type FleetSection = (typeof FLEET_SECTIONS)[number];

const PAGE_TITLES: Record<ExportPage, string> = {
  today: "Today",
  plan: "Plan",
  tests: "Tests",
  fleet: "Fleet",
  issues: "Issues",
  deploy: "Deploy",
  reports: "All pages",
};

function weatherValue(state: HubState) {
  const live = readWeatherCache();
  if (live) return `${live.place}: ${weatherLine(live)}`;
  return blank(state.weather);
}

function blank(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

function when(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return `${formatDate(iso)} ${iso.includes("T") ? formatTime(iso) : ""}`.trim();
  } catch {
    return iso;
  }
}

function fleetSection(drone: Drone): FleetSection {
  if (drone.family === "Battery" || drone.name.toLowerCase().includes("battery")) return "Batteries";
  if (drone.family === "Ground" || drone.name.toLowerCase().includes("rotator")) return "Rotator";
  if (drone.family === "SkyHive SF" || /hive|skyfence/i.test(drone.name)) return "Hive";
  return "Aircraft";
}

function simSections(lastSim: SimStore | null): PdfSection[] {
  const sim = summarizeSim(lastSim);
  if (!sim) {
    return [
      {
        heading: "Last SIM run",
        empty: "No shared SIM snapshot in this hub.",
      },
    ];
  }
  return [
    {
      heading: "Last SIM run",
      rows: [
        { label: "Run", value: sim.name },
        { label: "When", value: sim.startedAt ? when(sim.startedAt) : "Time not set" },
        { label: "Tester", value: blank(sim.tester) },
        {
          label: "Score",
          value: `${sim.passed} pass / ${sim.failed} fail / ${sim.blocked} blocked of ${sim.scored} scored`,
        },
      ],
    },
    sim.artifacts.length
      ? {
          heading: "Last successful .deb",
          records: sim.artifacts.map((item) => ({
            title: item.packageName,
            lines: [item.filename],
          })),
        }
      : { heading: "Last successful .deb", empty: "No .deb names on that run." },
  ];
}

function todaySections(state: HubState, lastSim: SimStore | null): PdfSection[] {
  const kpi = counts(state);
  const plan = activePlan(state);
  const skipped = skippedPlanCarryover(state);
  const runs = todayRuns(state);
  const issues = openIssues(state);
  const actions = nextActions(state);
  const drones = state.drones.filter(isAirframe);
  const sections: PdfSection[] = [
    {
      heading: "Today",
      rows: [
        { label: "Site", value: blank(state.site) },
        { label: "Operator", value: blank(state.operator) },
        { label: "Weather", value: weatherValue(state) },
        { label: "Decision", value: state.decision },
        { label: "Reason", value: blank(state.decisionReason) },
        { label: "Still on the card", value: String(kpi.planned) },
        {
          label: "Available / under test / grounded",
          value: `${kpi.available} / ${kpi.underTest} / ${kpi.grounded}`,
        },
        { label: "Open issues", value: String(kpi.open) },
        { label: "Ready for retest", value: String(kpi.readyRetest) },
      ],
    },
    ...simSections(lastSim),
    plan.length
      ? {
          heading: "Question 1 — What do I need to test today?",
          records: plan.map((item) => ({
            title: `${item.date} ${item.window}  ${planLabel(item, state)}`,
            lines: [
              `${item.kind === "flight" ? "Flight" : "Test"}  ·  ${item.status}`,
              `Airframe: ${blank(droneById(state, item.droneId)?.name)}`,
              `Owner: ${blank(item.owner)}`,
              `Notes: ${blank(item.notes)}`,
            ],
          })),
        }
      : {
          heading: "Question 1 — What do I need to test today?",
          empty: "Nothing left to test today. Past Done items are in Test history; skipped items move to question 3.",
        },
    issues.length
      ? {
          heading: "Question 2 — What is still unresolved?",
          records: issues.map((issue) => ({
            title: `${issue.id}  ${issue.severity}  ${issue.status}`,
            lines: [issue.title, blank(issue.retestResult || issue.actual)],
          })),
        }
      : {
          heading: "Question 2 — What is still unresolved?",
          empty: "No open issues from the last SIM run or Maintenance Assistant.",
        },
  ];

  if (skipped.length === 0 && actions.length === 0) {
    sections.push({
      heading: "Question 3 — What should we test next?",
      empty: "No recommended next step.",
    });
  } else {
    const records: { title: string; lines: string[] }[] = [];
    for (const item of skipped) {
      records.push({
        title: `${item.date} ${item.window}  ${planLabel(item, state)}`,
        lines: [
          `Skipped  ·  ${item.kind === "flight" ? "Flight" : "Test"}`,
          `Airframe: ${blank(droneById(state, item.droneId)?.name)}`,
          `Owner: ${blank(item.owner)}`,
          `Notes: ${blank(item.notes)}`,
        ],
      });
    }
    for (const action of actions) {
      records.push({
        title: `${action.priority.toUpperCase()}  ${action.title}`,
        lines: [action.why],
      });
    }
    sections.push({ heading: "Question 3 — What should we test next?", records });
  }

  sections.push(
    runs.length
      ? {
          heading: "Latest results (today)",
          records: runs.map((run) => {
            const testCase = caseById(state, run.testCaseId);
            const drone = droneById(state, run.droneId);
            const build = buildById(state, run.buildId);
            return {
              title: `${blank(testCase?.code)} ${blank(testCase?.name)}  ·  ${run.result}`,
              lines: [
                `${blank(drone?.name)}  ·  ${run.environment}`,
                build?.jenkins ? `Jenkins ${build.jenkins}` : blank(build?.label),
                run.measurements ? `Measured: ${run.measurements}` : "Measured: —",
                run.notes ? `Notes: ${run.notes}` : "Notes: —",
              ],
            };
          }),
        }
      : { heading: "Latest results (today)", empty: "No runs recorded today." },
    { heading: "Daily summary", intro: dailySummary(state) },
    drones.length
      ? {
          heading: "Fleet snapshot",
          records: drones.map((drone) => ({
            title: `${drone.name}  ·  ${drone.status}`,
            lines: [blank(drone.location)],
          })),
        }
      : { heading: "Fleet snapshot", empty: "No airframes in the Reporter equipment list." }
  );

  return sections;
}

function planSections(state: HubState): PdfSection[] {
  const plan = upcomingPlan(state);
  const nextPlan = questionThreePlan(state);
  const nextIssues = questionThreeIssues(state);
  const sections: PdfSection[] = [
    plan.length
      ? {
          heading: "Upcoming flights and tests",
          records: plan.map((item) => ({
            title: `${item.date} ${item.window}  ${planLabel(item, state)}`,
            lines: [
              `${item.kind === "flight" ? "Flight" : "Test"}  ·  ${item.status}`,
              `Airframe: ${blank(droneById(state, item.droneId)?.name)}`,
              `Owner: ${blank(item.owner)}`,
              `Notes: ${blank(item.notes)}`,
            ],
          })),
        }
      : {
          heading: "Upcoming flights and tests",
          empty: "The Upcoming flights board has nothing still dated today or later.",
        },
  ];

  if (nextPlan.length === 0 && nextIssues.length === 0) {
    sections.push({
      heading: "What should we test next?",
      empty: "Nothing extra from Today question 3.",
    });
  } else {
    sections.push({
      heading: "What should we test next?",
      records: [
        ...nextPlan.map((item) => ({
          title: `${item.date} ${item.window}  ${planLabel(item, state)}`,
          lines: [
            `${item.kind === "flight" ? "Flight" : "Test"}  ·  ${item.status}`,
            `Airframe: ${blank(droneById(state, item.droneId)?.name)}`,
            `Owner: ${blank(item.owner)}`,
            `Notes: ${blank(item.notes)}`,
          ],
        })),
        ...nextIssues.map((action) => ({
          title: `${action.priority.toUpperCase()}  ${action.title}`,
          lines: [action.why],
        })),
      ],
    });
  }
  return sections;
}

function testsSections(state: HubState, lastSim: SimStore | null): PdfSection[] {
  const history = [...state.runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return [
    ...simSections(lastSim),
    state.testCases.length
      ? {
          heading: "Test library",
          records: state.testCases.map((item) => {
            const itemRuns = history.filter((run) => run.testCaseId === item.id);
            const last = itemRuns[0];
            return {
              title: `${item.code}  ${item.name}`,
              lines: [
                `${item.environment}  ·  ${item.missionType}`,
                `Expected: ${blank(item.expected)}`,
                `Last result: ${last ? last.result : "Not run"}`,
                `${itemRuns.length} recorded runs`,
              ],
            };
          }),
        }
      : { heading: "Test library", empty: "No SIM catalog in this hub." },
    history.length
      ? {
          heading: "Recorded runs",
          records: history.map((run) => {
            const test = caseById(state, run.testCaseId);
            const drone = droneById(state, run.droneId);
            const build = buildById(state, run.buildId);
            return {
              title: `${blank(test?.code)} ${blank(test?.name)}  ·  ${run.result}`,
              lines: [
                when(run.startedAt),
                `${blank(drone?.name)}  ·  ${run.environment}`,
                build?.jenkins ? `Jenkins ${build.jenkins}` : blank(build?.label),
                run.measurements ? `Measured: ${run.measurements}` : "Measured: —",
                run.notes ? `Notes: ${run.notes}` : "Notes: —",
              ],
            };
          }),
        }
      : { heading: "Recorded runs", empty: "No runs recorded in this hub yet." },
  ];
}

function fleetSections(state: HubState): PdfSection[] {
  const sections: PdfSection[] = [];
  for (const section of FLEET_SECTIONS) {
    const items = state.drones.filter((drone) => fleetSection(drone) === section);
    if (!items.length) continue;
    sections.push({
      heading: `${section} (${items.length})`,
      records: items.map((drone) => {
        const build = buildById(state, drone.buildId);
        const airframe = isAirframe(drone);
        const lines = [
          drone.family,
          airframe ? `Status: ${drone.status}` : "Status: —",
          `Location: ${blank(drone.location)}${drone.holder ? `  ·  ${drone.holder}` : ""}`,
          drone.gimbal ? `Gimbal: ${drone.gimbal}` : "",
          airframe
            ? `Build: ${blank(build?.label)}${build?.jenkins ? `  ·  Jenkins ${build.jenkins}` : ""}`
            : "",
          drone.hours ? `Hours: ${drone.hours.toFixed(1)}` : "",
          drone.hardware ? `Hardware: ${drone.hardware}` : "",
          drone.notes ? `Notes: ${drone.notes}` : "",
        ].filter(Boolean);
        return { title: drone.name, lines };
      }),
    });
  }
  if (!state.drones.length) {
    sections.push({ heading: "Fleet", empty: "No hardware from the locator or Reporter equipment list." });
  }
  sections.push(
    state.builds.length
      ? {
          heading: "Software builds",
          records: state.builds.map((build) => ({
            title: build.label,
            lines: [
              build.jenkins ? `Jenkins ${build.jenkins}` : "SIM packages",
              `PX4: ${blank(build.px4)}`,
              `SkyCommand: ${blank(build.skyCommand)}`,
              `SkyHive: ${blank(build.skyHive)}`,
              `GCS: ${blank(build.gcs)}`,
              `Autonomy: ${blank(build.autonomyNode)}`,
              build.notes ? `Notes: ${build.notes}` : "",
            ].filter(Boolean),
          })),
        }
      : { heading: "Software builds", empty: "No software builds stored in this hub." }
  );
  return sections;
}

function issuesSections(state: HubState): PdfSection[] {
  if (!state.issues.length) {
    return [{ heading: "Issues", empty: "No issues in this hub." }];
  }
  return [
    {
      heading: "Bugs, fixes & retests",
      records: state.issues.map((issue) => {
        const drone = droneById(state, issue.droneId);
        const build = buildById(state, issue.buildId);
        return {
          title: `${issue.id}  ${issue.severity}  ${issue.status}`,
          lines: [
            issue.title,
            `Mission: ${blank(issue.missionType)}  ·  ${issue.environment}`,
            `Airframe: ${blank(drone?.name)}`,
            `Build: ${build?.jenkins ? `Jenkins ${build.jenkins}` : blank(build?.label)}`,
            `Steps: ${blank(issue.stepsToReproduce)}`,
            `Expected: ${blank(issue.expected)}`,
            `Actual: ${blank(issue.actual)}`,
            `Assignee: ${blank(issue.assignee)}`,
            `Retest: ${blank(issue.retestResult)}`,
            `Logged: ${when(issue.createdAt)}`,
          ],
        };
      }),
    },
  ];
}

function deploySections(state: HubState): PdfSection[] {
  const remaining = state.checklist.filter((item) => !item.done).length;
  const groups = [...new Set(state.checklist.map((item) => item.group))];
  if (!state.checklist.length) {
    return [{ heading: "Field deployment checklist", empty: "No checklist items in this hub." }];
  }
  return [
    {
      heading: "Field deployment checklist",
      intro: remaining === 0 ? "Checklist complete." : `${remaining} items still open.`,
    },
    ...groups.map((group) => {
      const items = state.checklist.filter((item) => item.group === group);
      const done = items.filter((item) => item.done).length;
      return {
        heading: `${group}  (${done}/${items.length} done)`,
        records: items.map((item) => ({
          title: `${item.done ? "Done" : "Open"}  ${item.label}`,
          lines: [
            item.location ? `Location: ${item.location}${item.holder ? `  ·  ${item.holder}` : ""}` : "Location: —",
            item.done && item.at ? `Ticked: ${item.by}  ·  ${formatClock(new Date(item.at))}` : "Not ticked yet.",
          ],
        })),
      };
    }),
  ];
}

function reportsOnlySections(state: HubState): PdfSection[] {
  return [
    state.reports.length
      ? {
          heading: "Flight reports",
          records: state.reports.map((report) => ({
            title: `${report.title}  ·  ${report.overall}`,
            lines: [
              when(report.date),
              report.summary,
              `Airframes: ${
                report.droneIds.map((id) => droneById(state, id)?.name).filter(Boolean).join(", ") || "—"
              }`,
              `${report.runIds.length} linked runs`,
            ],
          })),
        }
      : {
          heading: "Flight reports",
          empty: "No Flight Test Reporter JSON in this hub yet.",
        },
    state.evidence.length
      ? {
          heading: "Evidence organizer",
          records: state.evidence.map((item) => ({
            title: `${item.kind}  ${item.filename}`,
            lines: [
              `Airframe: ${blank(droneById(state, item.droneId)?.name ?? item.droneId)}`,
              `Run: ${blank(item.testRunId)}`,
              `Build: ${blank(item.buildId)}`,
              `Notes: ${blank(item.notes)}`,
            ],
          })),
        }
      : { heading: "Evidence organizer", empty: "No evidence names attached in this hub." },
    state.knowledge.length
      ? {
          heading: "Knowledge",
          records: state.knowledge.map((note) => ({
            title: note.title,
            lines: [note.tags.join(" · ") || "No tags", note.body],
          })),
        }
      : { heading: "Knowledge", empty: "No procedure notes stored." },
  ];
}

function sectionsFor(page: ExportPage, state: HubState, lastSim: SimStore | null): PdfSection[] {
  switch (page) {
    case "today":
      return todaySections(state, lastSim);
    case "plan":
      return planSections(state);
    case "tests":
      return testsSections(state, lastSim);
    case "fleet":
      return fleetSections(state);
    case "issues":
      return issuesSections(state);
    case "deploy":
      return deploySections(state);
    case "reports":
      return [
        ...todaySections(state, lastSim),
        ...planSections(state),
        ...testsSections(state, lastSim),
        ...fleetSections(state),
        ...issuesSections(state),
        ...deploySections(state),
        ...reportsOnlySections(state),
      ];
  }
}

export function exportHubPdf(page: ExportPage, state: HubState, lastSim: SimStore | null) {
  const title = PAGE_TITLES[page];
  const generated = formatClock(new Date());
  const bytes = buildPdf({
    title: page === "reports" ? "Field Test Operations — all pages" : `Field Test Operations — ${title}`,
    subtitle: [state.site, state.operator, state.decision].filter(Boolean).join(" · "),
    generated,
    version: APP_VERSION,
    sections: sectionsFor(page, state, lastSim),
  });
  const stamp = todayIso();
  const slug = page === "reports" ? "All-pages" : title.replaceAll(" ", "-");
  downloadPdf(`FTOD-${slug}-${stamp}.pdf`, bytes);
}
