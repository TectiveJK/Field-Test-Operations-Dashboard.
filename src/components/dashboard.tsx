"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { PlanDialog } from "@/components/plan-dialog";
import { RecordRunDialog } from "@/components/record-run-dialog";
import { StatusBadge } from "@/components/status-badge";
import { TestHistoryDialog } from "@/components/test-history-dialog";
import { formatDate, formatTime } from "@/lib/format";
import { EXISTING_APPS } from "@/lib/seed";
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
  skippedPlanCarryover,
  todayRuns,
} from "@/lib/selectors";
import { summarizeReporter } from "@/lib/reporter-import";
import { summarizeSim } from "@/lib/sim-import";
import { useHub } from "@/lib/store";
import { GO_DECISIONS, isAirframe, type GoDecision } from "@/lib/types";

export function Dashboard() {
  const { state, lastSim, lastReporter, setDecision } = useHub();
  const [reason, setReason] = useState(state.decisionReason);
  const kpi = counts(state);
  const plan = activePlan(state);
  const skipped = skippedPlanCarryover(state);
  const runs = todayRuns(state);
  const issues = openIssues(state);
  const actions = nextActions(state);
  const summary = dailySummary(state);
  const drones = state.drones.filter(isAirframe);
  const sim = summarizeSim(lastSim);
  const field = summarizeReporter(lastReporter);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">Today</h2>
          <p className="mt-1 text-sm text-slate-600">
            GO / NO-GO, last field report, last SIM run, and the three questions for the day.
          </p>
        </div>
        <ExportPdfButton page="today" />
      </div>
      <section className="overflow-hidden rounded-xl border border-slate-200">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/tective-banner.png`}
          alt="Tective — Automated drone deployment"
          className="block h-auto w-full object-cover object-center"
        />
      </section>

      <section
        className={
          state.decision === "NO-GO"
            ? "rounded-xl border border-red-300 bg-red-50 p-3 sm:p-4"
            : state.decision === "CONDITIONAL"
              ? "rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-4"
              : "rounded-xl border border-emerald-300 bg-emerald-50 p-3 sm:p-4"
        }
      >
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
            <Select
              value={state.decision}
              onValueChange={(value) => value && setDecision(value as GoDecision, reason)}
            >
              <SelectTrigger className="flex-1 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GO_DECISIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RecordRunDialog />
          </div>
          <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="bg-white"
              placeholder="GO / NO-GO reason"
            />
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => setDecision(state.decision, reason)}
            >
              Update
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          {field ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
                  LAST FIELD REPORT
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {field.location || "Drone Flight Test Reporter"}
                </p>
                <p className="text-xs text-slate-600">
                  {field.date ? formatDate(field.date) : "Date not set"}
                  {field.operator ? ` · ${field.operator}` : ""}
                  {field.observer ? ` · ${field.observer}` : ""}
                  {` · ${field.passed} pass / ${field.observations} observations / ${field.failed} fail / ${field.aborted} aborted of ${field.scored} scored`}
                </p>
                {field.conclusion ? (
                  <p className="mt-1 text-xs text-slate-600">{field.conclusion}</p>
                ) : null}
              </div>
              <div className="min-w-0 sm:max-w-xs sm:text-right">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">OVERALL</p>
                <div className="mt-1 flex sm:justify-end">
                  <StatusBadge value={field.overall} />
                </div>
                {field.equipment.length ? (
                  <p className="mt-1 text-[11px] text-slate-600">{field.equipment.join(", ")}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
                LAST FIELD REPORT
              </p>
              <p className="mt-1 text-sm text-slate-700">
                No shared field report yet. After you save a report in Drone Flight Test Reporter,
                open this hub on the laptop in the same browser (while online). This phone then
                picks up those flights, Fail items, and the overall result.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          {sim ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">LAST SIM RUN</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sim.name}</p>
                <p className="text-xs text-slate-600">
                  {sim.startedAt ? `${formatDate(sim.startedAt)} ${formatTime(sim.startedAt)}` : "Time not set"}
                  {sim.tester ? ` · ${sim.tester}` : ""}
                  {` · ${sim.passed} pass / ${sim.failed} fail / ${sim.blocked} blocked of ${sim.scored} scored`}
                </p>
                {sim.openRunName ? (
                  <p className="mt-1 text-xs text-amber-800">
                    {sim.openRunName} is open in SIM Flight Testing with no pass / fail yet. This
                    card shows the last scored run. Open this hub on the laptop in the same browser
                    as SIM after you score it.
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 sm:max-w-md sm:text-right">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">LAST SUCCESSFUL .DEB</p>
                {sim.artifacts.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {sim.artifacts.map((item) => (
                      <li key={`${item.packageName}-${item.filename}`} className="text-[11px] text-slate-700">
                        <span className="text-slate-500">{item.packageName}</span>
                        <span className="block truncate font-mono">{item.filename}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-600">No .deb names on that run.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">LAST SIM RUN</p>
              <p className="mt-1 text-sm text-slate-700">
                No shared SIM snapshot yet. After a SIM run, open this hub on the laptop in the same
                browser as SIM Flight Testing (while online). This phone then picks up that run, FAIL /
                BLOCKED items, and package names.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Still on the card", value: kpi.planned, href: "/plan" },
          { label: "Available / under test / grounded", value: `${kpi.available} / ${kpi.underTest} / ${kpi.grounded}`, href: "/fleet" },
          { label: "Open issues", value: kpi.open, href: "/issues" },
          { label: "Ready for retest", value: kpi.readyRetest, href: "/issues" },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <Card size="sm" className="bg-white hover:ring-foreground/20">
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="font-mono text-2xl">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <QuestionCard
          index="1"
          title="What do I need to test today?"
          href="/plan"
          extra={
            <>
              <PlanDialog mode="add" defaultKind="flight" />
              <PlanDialog mode="add" defaultKind="test" />
              <TestHistoryDialog />
            </>
          }
        >
          {plan.length === 0 ? (
            <Empty>Nothing left to test today. Past Done items are in Test history; skipped items move to question 3.</Empty>
          ) : (
            <ul className="divide-y">
              {plan.map((item) => {
                const drone = droneById(state, item.droneId);
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-mono text-xs text-slate-500">
                          {item.date} {item.window}
                        </span>{" "}
                        {planLabel(item, state)}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {item.kind === "flight" ? "Flight" : "Test"}
                        {drone ? ` · ${drone.name}` : ""}
                        {item.owner ? ` · ${item.owner}` : ""}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge value={item.status} />
                      <PlanDialog mode="edit" item={item} triggerLabel="Edit title" titleOnly />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QuestionCard>

        <QuestionCard index="2" title="What is still unresolved?" href="/issues">
          {issues.length === 0 ? (
            <Empty>
              {field || sim
                ? "Last field report and SIM run left no open Fail / BLOCKED items. Maintenance Assistant still has none stored."
                : "No open issues from the last field report, SIM run, or Maintenance Assistant."}
            </Empty>
          ) : (
            <ul className="divide-y">
              {issues.map((issue) => (
                <li key={issue.id} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{issue.id}</span>
                    <StatusBadge value={issue.severity} />
                    <StatusBadge value={issue.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">{issue.title}</p>
                  <p className="text-xs text-slate-600">{issue.retestResult || issue.actual}</p>
                </li>
              ))}
            </ul>
          )}
        </QuestionCard>

        <QuestionCard
          index="3"
          title="What should we test next?"
          href="/tests"
          extra={<PlanDialog mode="add" defaultKind="test" />}
        >
          {skipped.length === 0 && actions.length === 0 ? (
            <Empty>No recommended next step.</Empty>
          ) : (
            <ul className="divide-y">
              {skipped.map((item) => {
                const drone = droneById(state, item.droneId);
                return (
                  <li key={item.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge value="Skipped" />
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          <span className="font-mono text-xs text-slate-500">
                            {item.date} {item.window}
                          </span>{" "}
                          {planLabel(item, state)}
                        </p>
                        <p className="truncate text-xs text-slate-600">
                          Skipped on that day
                          {item.kind === "flight" ? " · Flight" : " · Test"}
                          {item.owner ? ` · ${item.owner}` : ""}
                          {drone ? ` · ${drone.name}` : ""}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      </div>
                      <PlanDialog mode="edit" item={item} triggerLabel="Edit title" titleOnly />
                    </div>
                  </li>
                );
              })}
              {actions.map((action) => {
                const planItem = action.planId
                  ? state.plan.find((item) => item.id === action.planId)
                  : undefined;
                return (
                  <li key={action.title} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            tone={
                              action.priority === "now"
                                ? "fail"
                                : action.priority === "blocked"
                                  ? "watch"
                                  : "pending"
                            }
                          >
                            {action.priority}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">{action.title}</p>
                        <p className="text-xs text-slate-600">{action.why}</p>
                      </div>
                      {planItem ? (
                        <PlanDialog mode="edit" item={planItem} triggerLabel="Edit title" titleOnly />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QuestionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
        <Card className="bg-white">
          <CardHeader className="border-b">
            <CardTitle>Latest results</CardTitle>
            <CardDescription>
              Today&apos;s field flights from Drone Flight Test Reporter, plus SIM cases recorded in this hub
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <Empty>No runs recorded today.</Empty>
            ) : (
              <ul className="divide-y">
                {runs.map((run) => {
                  const testCase = caseById(state, run.testCaseId);
                  const drone = droneById(state, run.droneId);
                  const build = buildById(state, run.buildId);
                  return (
                    <li key={run.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {testCase?.code} {testCase?.name}
                        </p>
                        <p className="truncate text-xs text-slate-600">
                          {drone?.name}
                          {build?.jenkins ? ` · Jenkins ${build.jenkins}` : build?.label ? ` · ${build.label}` : ""}
                          {` · ${run.environment}`}
                          {run.measurements ? ` · ${run.measurements}` : ""}
                        </p>
                      </div>
                      <StatusBadge value={run.result} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Daily summary</CardTitle>
              <CardDescription>Completed, failed, open, still on the card</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-800">{summary}</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Fleet snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {drones.length === 0 ? (
                <p className="text-sm text-slate-600">No airframes in the Reporter equipment list.</p>
              ) : (
                drones.map((drone) => (
                  <div key={drone.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-mono truncate">{drone.name}</span>
                      {drone.location ? (
                        <p className="truncate text-xs text-slate-600">{drone.location}</p>
                      ) : null}
                    </div>
                    <StatusBadge value={drone.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Existing tools — do not replace</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXISTING_APPS.map((app) => (
            <Card key={app.name} size="sm" className="bg-white">
              <CardHeader>
                <CardDescription>{app.area}</CardDescription>
                <CardTitle className="text-base">{app.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <p className="text-sm text-slate-600">{app.note}</p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={app.href}
                      {...(app.href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    />
                  }
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuestionCard({
  index,
  title,
  href,
  extra,
  children,
}: {
  index: string;
  title: string;
  href: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="border-b">
        <CardDescription>Question {index}</CardDescription>
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
      <div className="flex flex-wrap gap-2 border-t px-4 py-3">
        {extra}
        <Button variant="outline" nativeButton={false} render={<Link href={href} />}>
          Open module
        </Button>
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-slate-600">{children}</p>;
}
