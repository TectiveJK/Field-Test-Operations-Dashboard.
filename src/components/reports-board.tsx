"use client";

import { useMemo, useState } from "react";
import { ExportPdfButton } from "@/components/export-pdf-button";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { isEmptyReporterDraft, summarizeReporter } from "@/lib/reporter-import";
import { parseReporterExport, reporterStoreFromFile } from "@/lib/reporter-parse";
import { caseById, droneById } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/lib/types";

function ImportReporterCard() {
  const { importReporter, lastReporter } = useHub();
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const current = summarizeReporter(lastReporter);

  async function applyText(text: string, source: string) {
    const store = parseReporterExport(text);
    if (!store || isEmptyReporterDraft(store)) {
      setOk("");
      setError(
        `That ${source} has no scored flights. In Drone Flight Test Reporter use Share, then paste the report text here, or upload the Print PDF.`
      );
      return;
    }
    importReporter(store);
    const summary = summarizeReporter(store);
    setError("");
    setOk(
      `Imported ${store.flights.length} flights${summary ? ` · ${summary.overall}` : ""} from ${source}. Today, Tests, Issues and Reports now use this campaign.`
    );
    setPaste("");
  }

  async function onPaste() {
    if (!paste.trim()) {
      setError("Paste the Share text from the reporter preview first.");
      setOk("");
      return;
    }
    setBusy(true);
    try {
      await applyText(paste, "Share text");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setOk("");
    setError("");
    try {
      const store = await reporterStoreFromFile(file);
      if (!store || isEmptyReporterDraft(store)) {
        setError(
          `Could not read scored flights from ${file.name}. Paste the Share text from the reporter preview instead.`
        );
        return;
      }
      importReporter(store);
      const summary = summarizeReporter(store);
      setOk(
        `Imported ${store.flights.length} flights${summary ? ` · ${summary.overall}` : ""} from ${file.name}. Today, Tests, Issues and Reports now use this campaign.`
      );
      setPaste("");
    } catch {
      setError("Could not read that file. Paste the Share text from the reporter preview instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Import field report</CardTitle>
        <CardDescription>
          Export Report on the Linux reporter writes a Chromium PDF. Upload that PDF here
          (including 23-Oct-2026.pdf), or paste Share text from the iPhone reporter. A save
          in the same laptop browser is picked up within a second.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {current ? (
          <p className="text-sm text-slate-700">
            Hub now has {current.location || "the latest campaign"}
            {current.date ? ` · ${formatDate(current.date)}` : ""} · {current.passed} pass /{" "}
            {current.observations} observations / {current.failed} fail / {current.aborted} aborted
            of {current.scored} scored · {current.overall}.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            No field report in this hub yet. Import the export from today, or open this hub on
            the laptop after you save the report in the reporter app.
          </p>
        )}
        <Textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          placeholder="Paste Share text from Drone Flight Test Reporter…"
          className="bg-slate-50"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => void onPaste()} disabled={busy}>
            {busy ? "Importing…" : "Import paste"}
          </Button>
          <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">
            PDF or JSON
            <Input
              type="file"
              accept=".pdf,.json,.txt,application/pdf,application/json,text/plain"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                void onFile(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {ok ? <p className="text-sm text-emerald-800">{ok}</p> : null}
      </CardContent>
    </Card>
  );
}

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">Reports, evidence & knowledge</h2>
          <p className="mt-1 text-sm text-slate-600">
            The latest Drone Flight Test Reporter campaign and the last SIM Flight Testing run
            are listed here when this hub has seen them on the laptop or iPhone. Import a Share
            paste or Print PDF if Export did not update Today. Export PDF on this page writes
            every hub page into one file.
          </p>
        </div>
        <ExportPdfButton page="reports" />
      </div>

      <ImportReporterCard />

      <section className="grid gap-3">
        {state.reports.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-10 text-center text-sm text-slate-600">
              No field or SIM report in this hub yet. Import the reporter Share text or Print PDF
              above, or save a report in Drone Flight Test Reporter and open this hub on the
              laptop in the same browser.
            </CardContent>
          </Card>
        ) : null}
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
                placeholder="ulog or pcap filename"
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
            <p className="py-6 text-sm text-slate-600">
              No evidence names yet. Attach a ULog or pcap filename when you record a run.
            </p>
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
          {state.knowledge.length === 0 ? (
            <p className="text-sm text-slate-600">No procedure notes stored.</p>
          ) : null}
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
