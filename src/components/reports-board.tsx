"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
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
import { formatDate } from "@/lib/format";
import { caseById, droneById } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/lib/types";

export function ReportsBoard() {
  const { state, addEvidence } = useHub();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<EvidenceKind>("ULog");
  const [filename, setFilename] = useState("");
  const [droneId, setDroneId] = useState(state.drones[0]?.id ?? "none");
  const [runId, setRunId] = useState(state.runs[0]?.id ?? "none");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const evidence = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.evidence.filter((item) => {
      return (
        !q ||
        `${item.filename} ${item.kind} ${item.notes} ${item.droneId ?? ""}`.toLowerCase().includes(q)
      );
    });
  }, [state.evidence, query]);

  function saveEvidence() {
    if (!filename.trim()) {
      setError("Filename is required. On the pad, type the ULog name even if you cannot upload.");
      return;
    }
    addEvidence({
      kind,
      filename: filename.trim(),
      droneId: droneId === "none" ? null : droneId,
      testRunId: runId === "none" ? null : runId,
      notes,
    });
    setFilename("");
    setNotes("");
    setError("");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Reports, evidence & knowledge</h2>
        <p className="mt-1 text-sm text-slate-600">
          Flight reports stay in the Reporter app. This hub keeps the index: which ULog belongs to
          which drone, run, build and issue — plus the procedures you actually use on the range.
        </p>
      </div>

      <section className="grid gap-3">
        {state.reports.map((report) => (
          <Card key={report.id} className="bg-white">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardDescription>{formatDate(report.date)}</CardDescription>
                  <CardTitle>{report.title}</CardTitle>
                </div>
                <StatusBadge value={report.overall} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm text-slate-700">
              <p>{report.summary}</p>
              <p className="text-xs text-slate-500">
                {report.droneIds.map((id) => droneById(state, id)?.name).join(", ")} ·{" "}
                {report.runIds.length} runs
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Evidence organizer</CardTitle>
          <CardDescription>
            Associate logs, screenshots, videos and ULogs with drone, test run and build. Names
            only in the field; files stay on the laptop.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium">
              Kind
              <Select
                value={kind}
                onValueChange={(value) => value && setKind(value as EvidenceKind)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_KINDS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Filename
              <Input
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="f04_refly-sf-031.ulg"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Drone
              <Select value={droneId} onValueChange={(value) => value && setDroneId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {state.drones.map((drone) => (
                    <SelectItem key={drone.id} value={drone.id}>
                      {drone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Test run
              <Select value={runId} onValueChange={(value) => value && setRunId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {state.runs.map((run) => {
                    const testCase = caseById(state, run.testCaseId);
                    return (
                      <SelectItem key={run.id} value={run.id}>
                        {testCase?.code} {formatDate(run.startedAt)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What this file proves"
              className="flex-1"
            />
            <Button onClick={saveEvidence}>Attach</Button>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter evidence…"
            className="bg-slate-50"
          />
          {evidence.length === 0 ? (
            <p className="py-6 text-sm text-slate-600">No evidence matches.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {evidence.map((item) => (
                <li key={item.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[7rem_1fr_auto]">
                  <StatusBadge tone="mute">{item.kind}</StatusBadge>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{item.filename}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.droneId} · {item.buildId} · {item.notes}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Knowledge</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {state.knowledge.map((note) => (
            <Card key={note.id} size="sm" className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">{note.title}</CardTitle>
                <CardDescription>{note.tags.join(" · ")}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{note.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
