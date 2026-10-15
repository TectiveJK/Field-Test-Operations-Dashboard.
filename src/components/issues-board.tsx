"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatClock } from "@/lib/format";
import { buildById, droneById } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/types";

export function IssuesBoard() {
  const { state, setIssueStatus } = useHub();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("OPENISH");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.issues.filter((issue) => {
      const drone = droneById(state, issue.droneId);
      const matchesQuery =
        !q ||
        `${issue.id} ${issue.title} ${issue.actual} ${drone?.name ?? ""} ${issue.missionType}`
          .toLowerCase()
          .includes(q);
      const matchesStatus =
        status === "all"
          ? true
          : status === "OPENISH"
            ? issue.status !== "RESOLVED"
            : issue.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [state, query, status]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Bugs, fixes & retests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Failed and blocked missions from the last SIM Flight Testing run (shared with the
          iPhone), plus anything you log here. Maintenance Assistant still has no stored faults.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ISS-id, airframe, mission…"
          className="bg-white"
        />
        <Select value={status} onValueChange={(value) => value && setStatus(value)}>
          <SelectTrigger className="w-full bg-white sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPENISH">Open + retest</SelectItem>
            <SelectItem value="all">All issues</SelectItem>
            {ISSUE_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-sm text-slate-600">
            No issues in this view. Open this hub on github.io in the same browser as SIM Flight
            Testing so the last run can be read, or log an issue from the header.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((issue) => {
            const drone = droneById(state, issue.droneId);
            const build = buildById(state, issue.buildId);
            const run = state.runs.find((item) => item.id === issue.testRunId);
            return (
              <Card key={issue.id} className="bg-white">
                <CardContent className="grid gap-3 pt-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{issue.id}</span>
                      <StatusBadge value={issue.severity} />
                      <StatusBadge tone="mute">{issue.environment}</StatusBadge>
                      {drone ? <span className="font-mono text-xs">{drone.name}</span> : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{issue.title}</h3>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Mission / build</dt>
                        <dd>
                          {issue.missionType} · Jenkins {build?.jenkins ?? "—"}
                          {run ? ` · run ${run.id}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Steps</dt>
                        <dd>{issue.stepsToReproduce}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Expected vs actual</dt>
                        <dd>
                          {issue.expected}
                          <span className="text-slate-400"> → </span>
                          {issue.actual}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Assignee / retest
                        </dt>
                        <dd>
                          {issue.assignee}. {issue.retestResult || "No retest yet."}
                        </dd>
                      </div>
                      <p className="text-xs text-slate-500">
                        Logged {formatClock(new Date(issue.createdAt))}
                      </p>
                    </dl>
                  </div>
                  <label className="grid h-fit gap-1 text-sm font-medium">
                    Status
                    <Select
                      value={issue.status}
                      onValueChange={(value) =>
                        value && setIssueStatus(issue.id, value as IssueStatus)
                      }
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
