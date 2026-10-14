"use client";

import { useMemo, useState } from "react";
import { RecordRunDialog } from "@/components/record-run-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime } from "@/lib/format";
import { buildById, droneById, runsForCase } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { RUN_RESULTS, type RunResult } from "@/lib/types";

export function TestsBoard() {
  const { state, setRunResult } = useHub();
  const [caseId, setCaseId] = useState(state.testCases[4]?.id ?? state.testCases[0].id);
  const runs = runsForCase(state, caseId);
  const [left, setLeft] = useState(runs[0]?.id ?? "");
  const [right, setRight] = useState(runs[1]?.id ?? runs[0]?.id ?? "");
  const testCase = state.testCases.find((item) => item.id === caseId);
  const leftRun = state.runs.find((run) => run.id === left);
  const rightRun = state.runs.find((run) => run.id === right);

  const history = useMemo(
    () =>
      [...state.runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 12),
    [state.runs]
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Regression tests & runs</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Reusable cases for corridor, ROI, Go To, Resume, GNSS-denied, AprilTag and kill-switch.
            Record a run against a Jenkins build. Compare two runs of the same mission.
          </p>
        </div>
        <RecordRunDialog />
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="history">Recent runs</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-4 grid gap-3 md:grid-cols-2">
          {state.testCases.map((item) => {
            const itemRuns = runsForCase(state, item.id);
            const last = itemRuns[0];
            return (
              <Card key={item.id} size="sm" className="bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardDescription>{item.code}</CardDescription>
                      <CardTitle>{item.name}</CardTitle>
                    </div>
                    {last ? <StatusBadge value={last.result} /> : <StatusBadge tone="mute">Not run</StatusBadge>}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-slate-700">
                  <p>
                    {item.environment} · {item.missionType}
                  </p>
                  <p className="text-xs text-slate-500">{item.expected}</p>
                  <p className="text-xs text-slate-500">{itemRuns.length} recorded runs</p>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-0">
              {history.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-600">No runs yet.</p>
              ) : (
                <ul className="divide-y">
                  {history.map((run) => {
                    const test = state.testCases.find((item) => item.id === run.testCaseId);
                    const drone = droneById(state, run.droneId);
                    const build = buildById(state, run.buildId);
                    return (
                      <li
                        key={run.id}
                        className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {test?.code} {test?.name}
                          </p>
                          <p className="truncate text-xs text-slate-600">
                            {formatDate(run.startedAt)} {formatTime(run.startedAt)} · {drone?.name} ·
                            Jenkins {build?.jenkins} · {run.environment}
                          </p>
                          {run.notes ? <p className="text-xs text-slate-500">{run.notes}</p> : null}
                        </div>
                        <Select
                          value={run.result}
                          onValueChange={(value) =>
                            value && setRunResult(run.id, value as RunResult)
                          }
                        >
                          <SelectTrigger className="w-full bg-white lg:w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RUN_RESULTS.map((result) => (
                              <SelectItem key={result} value={result}>
                                {result}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="mt-4 grid gap-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Compare two runs of the same mission</CardTitle>
              <CardDescription>
                Results, configuration and measurements. Start here; attach parsed ULogs later.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium">
                Test case
                <Select
                  value={caseId}
                  onValueChange={(value) => {
                    if (!value) return;
                    setCaseId(value);
                    const next = runsForCase(state, value);
                    setLeft(next[0]?.id ?? "");
                    setRight(next[1]?.id ?? next[0]?.id ?? "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.testCases.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <RunPick label="Run A" value={left} runs={runs} onChange={setLeft} />
              <RunPick label="Run B" value={right} runs={runs} onChange={setRight} />
            </CardContent>
          </Card>

          {leftRun && rightRun && testCase ? (
            <div className="grid gap-3 md:grid-cols-2">
              <RunCard title="Run A" run={leftRun} />
              <RunCard title="Run B" run={rightRun} />
            </div>
          ) : (
            <Card className="bg-white">
              <CardContent className="py-10 text-center text-sm text-slate-600">
                Record at least one run of this case to compare.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RunPick({
  label,
  value,
  runs,
  onChange,
}: {
  label: string;
  value: string;
  runs: { id: string; startedAt: string; result: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {runs.map((run) => (
            <SelectItem key={run.id} value={run.id}>
              {formatDate(run.startedAt)} {formatTime(run.startedAt)} · {run.result}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function RunCard({
  title,
  run,
}: {
  title: string;
  run: {
    droneId: string;
    buildId: string;
    environment: string;
    result: string;
    notes: string;
    measurements: string;
  };
}) {
  const { state } = useHub();
  const drone = droneById(state, run.droneId);
  const build = buildById(state, run.buildId);
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <StatusBadge value={run.result} />
        </div>
        <CardDescription>
          {drone?.name} · {run.environment}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-slate-700">
        <p>
          <span className="text-slate-500">Jenkins </span>
          {build?.jenkins} ({build?.label})
        </p>
        <p>
          <span className="text-slate-500">PX4 </span>
          {build?.px4}
        </p>
        <p>
          <span className="text-slate-500">SkyCommand / Hive </span>
          {build?.skyCommand} / {build?.skyHive}
        </p>
        <p>
          <span className="text-slate-500">Params </span>
          {drone?.parameters}
        </p>
        <p>
          <span className="text-slate-500">Hardware </span>
          {drone?.hardware}
        </p>
        <p>
          <span className="text-slate-500">Measured </span>
          {run.measurements || "—"}
        </p>
        <p>{run.notes}</p>
      </CardContent>
    </Card>
  );
}
