"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { formatClock, severityTone } from "@/lib/format";
import { useOps } from "@/lib/store";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/types";

export function IssuesBoard() {
  const { state, setIssueStatus } = useOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("OPENISH");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.issues.filter((issue) => {
      const aircraft = state.aircraft.find((asset) => asset.id === issue.aircraftId);
      const matchesQuery =
        !q ||
        `${issue.title} ${issue.description} ${issue.action} ${aircraft?.name ?? ""}`
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
  }, [state.issues, state.aircraft, query, status]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Issues and blockers</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anomalies from flights, failed inspection items, and ops holds. Resolved items drop off
          the default view.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, airframe, action…"
            className="bg-white pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value);
          }}
        >
          <SelectTrigger className="w-full bg-white sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPENISH">Open + in progress</SelectItem>
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
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No issues in this view</p>
            <p className="mt-1 text-sm text-slate-600">
              Log a new issue from the header, or switch the filter to All issues.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((issue) => {
            const aircraft = state.aircraft.find((asset) => asset.id === issue.aircraftId);
            const flight = state.flights.find((item) => item.id === issue.flightId);
            return (
              <Card key={issue.id} className="bg-white">
                <CardContent className="grid gap-3 pt-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={severityTone(issue.severity)}>
                        {issue.severity}
                      </StatusBadge>
                      <StatusBadge tone="mute">{issue.source}</StatusBadge>
                      {aircraft ? (
                        <span className="font-mono text-xs text-slate-600">{aircraft.name}</span>
                      ) : null}
                      {flight ? (
                        <span className="font-mono text-xs text-slate-500">{flight.number}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">{issue.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">Action: </span>
                      {issue.action}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Logged {formatClock(new Date(issue.createdAt))}
                    </p>
                  </div>
                  <div className="grid h-fit gap-2">
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <Select
                      value={issue.status}
                      onValueChange={(value) => {
                        if (value) setIssueStatus(issue.id, value as IssueStatus);
                      }}
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
                    {issue.status !== "RESOLVED" ? (
                      <Button
                        variant="outline"
                        onClick={() => setIssueStatus(issue.id, "RESOLVED")}
                      >
                        Mark resolved
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
