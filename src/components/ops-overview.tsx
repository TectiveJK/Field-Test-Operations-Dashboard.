"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BatteryCharging,
  CloudSun,
  Radio,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { decisionTone, formatTime, resultTone, severityTone } from "@/lib/format";
import { useOps } from "@/lib/store";
import type { GoDecision } from "@/lib/types";

export function OpsOverview() {
  const { today, todayFlights, openIssues, state, setDecision } = useOps();
  const [reason, setReason] = useState(today.decisionReason);

  const airborne = todayFlights.filter((flight) => flight.phase === "Airborne");
  const concluded = todayFlights.filter((flight) => flight.result !== "Pending");
  const passCount = todayFlights.filter(
    (flight) => flight.result === "Pass" || flight.result === "Pass with observations"
  ).length;
  const failCount = todayFlights.filter(
    (flight) => flight.result === "Fail" || flight.result === "Aborted"
  ).length;
  const readyAirframes = state.aircraft.filter(
    (asset) => asset.type === "Airframe" && asset.status === "Ready"
  ).length;
  const goodBatteries = state.batteries.filter((battery) => battery.health === "Good").length;
  const blocking = openIssues.filter(
    (issue) => issue.severity === "HIGH" || issue.severity === "CRITICAL"
  );

  const kpis = [
    { label: "Sorties today", value: String(todayFlights.length), hint: `${airborne.length} airborne` },
    { label: "Pass / observations", value: String(passCount), hint: `${concluded.length} concluded` },
    { label: "Fail / aborted", value: String(failCount), hint: failCount ? "see F03 / F05" : "none" },
    { label: "Airframes ready", value: String(readyAirframes), hint: `${state.aircraft.filter((a) => a.type === "Airframe").length} on the line` },
    { label: "Good packs", value: String(goodBatteries), hint: `${state.batteries.length} in the rack` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section
        className={
          today.decision === "NO-GO"
            ? "rounded-xl border border-red-300 bg-red-50 p-4 sm:p-5"
            : today.decision === "CONDITIONAL"
              ? "rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
              : "rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-600">
              TEST-DAY DECISION
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {today.decision}
              </h2>
              <StatusBadge tone={decisionTone(today.decision)}>
                {today.uavCategory}
              </StatusBadge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-800">{today.decisionReason}</p>
            <p className="mt-2 text-sm text-slate-700">{today.objective}</p>
          </div>
          <div className="grid w-full gap-2 sm:max-w-md">
            <Select
              value={today.decision}
              onValueChange={(value) => {
                if (value) setDecision(value as GoDecision, reason);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="CONDITIONAL">CONDITIONAL</SelectItem>
                <SelectItem value="NO-GO">NO-GO</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="bg-white"
              />
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => setDecision(today.decision, reason)}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} size="sm" className="bg-white">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="font-mono text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{kpi.hint}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
        <Card className="bg-white">
          <CardHeader className="border-b">
            <CardTitle>Today&apos;s sorties</CardTitle>
            <CardDescription>
              {todayFlights.length} flights on {today.objectiveType1} / {today.objectiveType2}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {todayFlights.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-600">
                No flights on the board yet. Add sorties from the Flight Test Reporter JSON drop.
              </p>
            ) : (
              <ul className="divide-y">
                {todayFlights.map((flight) => {
                  const aircraft = state.aircraft.find((asset) => asset.id === flight.aircraftId);
                  return (
                    <li key={flight.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{flight.number}</span>
                          <StatusBadge tone={resultTone(flight.result)}>
                            {flight.phase === "Airborne" ? "Airborne" : flight.result}
                          </StatusBadge>
                          <span className="text-xs text-slate-500">{formatTime(flight.start)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-800">
                          {aircraft?.name} · {flight.objective}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {flight.modes.join(", ")}
                          {flight.anomalies ? ` · ${flight.anomalies}` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-slate-500">{flight.duration}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t px-4 py-3">
              <Button variant="outline" render={<Link href="/flights" />}>
                Open flight board
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudSun className="size-4" />
                Range weather
              </CardTitle>
              <CardDescription>{today.weather}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mono text-lg font-semibold">{today.temperatureC}°</p>
                <p className="text-[11px] text-slate-500">Air temp</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold flex items-center justify-center gap-1">
                  <Wind className="size-3.5" />
                  {today.windMs}
                </p>
                <p className="text-[11px] text-slate-500">m/s wind</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold">{today.visibilityKm}</p>
                <p className="text-[11px] text-slate-500">km vis</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4" />
                Blocking issues
              </CardTitle>
              <CardDescription>
                {blocking.length} high-severity items still open
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {blocking.length === 0 ? (
                <p className="text-sm text-slate-600">No high-severity blockers. Continue on the conditional GO.</p>
              ) : (
                blocking.map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={severityTone(issue.severity)}>{issue.severity}</StatusBadge>
                      <span className="text-xs text-slate-500">{issue.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{issue.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{issue.action}</p>
                  </div>
                ))
              )}
              <Button variant="outline" render={<Link href="/issues" />}>
                All issues
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="size-4" />
                Ground kit
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {state.aircraft
                .filter((asset) => asset.type === "Ground")
                .map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between gap-2">
                    <span>{asset.name}</span>
                    <StatusBadge tone="pass">{asset.status}</StatusBadge>
                  </div>
                ))}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <BatteryCharging className="size-3.5" />
                  Ready packs
                </span>
                <span className="font-mono">{goodBatteries}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
