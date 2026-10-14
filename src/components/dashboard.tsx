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
import { RecordRunDialog } from "@/components/record-run-dialog";
import { StatusBadge } from "@/components/status-badge";
import { EXISTING_APPS } from "@/lib/seed";
import {
  buildById,
  caseById,
  counts,
  dailySummary,
  droneById,
  nextActions,
  openIssues,
  todayPlan,
  todayRuns,
} from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { GO_DECISIONS, type GoDecision } from "@/lib/types";

export function Dashboard() {
  const { state, setDecision } = useHub();
  const [reason, setReason] = useState(state.decisionReason);
  const kpi = counts(state);
  const plan = todayPlan(state);
  const runs = todayRuns(state);
  const issues = openIssues(state);
  const actions = nextActions(state);
  const summary = dailySummary(state);
  const drones = state.drones.filter((drone) => drone.family !== "Ground");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section
        className={
          state.decision === "NO-GO"
            ? "rounded-xl border border-red-300 bg-red-50 p-4 sm:p-5"
            : state.decision === "CONDITIONAL"
              ? "rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
              : "rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-600">
              THIS MORNING
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              What needs attention
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-800">{state.decisionReason}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:max-w-md">
            <div className="flex gap-2">
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
            <div className="flex gap-2">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="bg-white"
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
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Still to fly today", value: kpi.planned, href: "/plan" },
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
        >
          {plan.length === 0 ? (
            <Empty>Nothing on the card. Add sorties on Plan.</Empty>
          ) : (
            <ul className="divide-y">
              {plan.map((item) => {
                const testCase = caseById(state, item.testCaseId);
                const drone = droneById(state, item.droneId);
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-mono text-xs text-slate-500">{item.window}</span>{" "}
                        {testCase?.code} {testCase?.name}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {drone?.name} · {item.notes}
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </QuestionCard>

        <QuestionCard index="2" title="What is still unresolved?" href="/issues">
          {issues.length === 0 ? (
            <Empty>No open bugs. Keep flying the plan.</Empty>
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

        <QuestionCard index="3" title="What should we test next?" href="/tests">
          {actions.length === 0 ? (
            <Empty>No recommended next step.</Empty>
          ) : (
            <ul className="divide-y">
              {actions.map((action) => (
                <li key={action.title} className="py-2.5">
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
                </li>
              ))}
            </ul>
          )}
        </QuestionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
        <Card className="bg-white">
          <CardHeader className="border-b">
            <CardTitle>Latest results</CardTitle>
            <CardDescription>Today’s TestRuns, linked to drone + Jenkins build</CardDescription>
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
                          {drone?.name} · Jenkins {build?.jenkins} · {run.environment}
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
              {drones.map((drone) => (
                <div key={drone.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono truncate">{drone.name}</span>
                  <StatusBadge value={drone.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Existing tools — do not replace</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
  children,
}: {
  index: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="border-b">
        <CardDescription>Question {index}</CardDescription>
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
      <div className="border-t px-4 py-3">
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
