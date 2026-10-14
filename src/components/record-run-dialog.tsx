"use client";

import { useState } from "react";
import { ClipboardPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldTextarea } from "@/components/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHub } from "@/lib/store";
import { RUN_RESULTS, type RunResult } from "@/lib/types";

export function RecordRunDialog() {
  const { state, addRun } = useHub();
  const [open, setOpen] = useState(false);
  const [testCaseId, setTestCaseId] = useState(state.testCases[0]?.id ?? "");
  const [droneId, setDroneId] = useState(
    state.drones.find((drone) => drone.family !== "Ground")?.id ?? ""
  );
  const [buildId, setBuildId] = useState(state.builds.at(-1)?.id ?? "");
  const [environment, setEnvironment] = useState<"Field" | "Simulator">("Field");
  const [result, setResult] = useState<RunResult>("Pass");
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState("");

  function submit() {
    addRun({
      testCaseId,
      droneId,
      buildId,
      environment,
      result,
      notes: notes.trim() || "Recorded from the field hub.",
      measurements,
    });
    setNotes("");
    setMeasurements("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="bg-white" />}>
        <ClipboardPen data-icon="inline-start" />
        Record result
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a test run</DialogTitle>
          <DialogDescription>
            Manual entry now. ULog parsing can attach to the same TestRun later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Test case
            <Select value={testCaseId} onValueChange={(value) => value && setTestCaseId(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.testCases.map((testCase) => (
                  <SelectItem key={testCase.id} value={testCase.id}>
                    {testCase.code} {testCase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Drone
              <Select value={droneId} onValueChange={(value) => value && setDroneId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.drones
                    .filter((drone) => drone.family !== "Ground")
                    .map((drone) => (
                      <SelectItem key={drone.id} value={drone.id}>
                        {drone.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Build
              <Select value={buildId} onValueChange={(value) => value && setBuildId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.builds.map((build) => (
                    <SelectItem key={build.id} value={build.id}>
                      {build.label}
                      {build.jenkins ? ` · Jenkins ${build.jenkins}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Environment
              <Select
                value={environment}
                onValueChange={(value) =>
                  value && setEnvironment(value as "Field" | "Simulator")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Field">Field</SelectItem>
                  <SelectItem value="Simulator">Simulator</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Result
              <Select
                value={result}
                onValueChange={(value) => value && setResult(value as RunResult)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_RESULTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Notes
            <FieldTextarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Measurements
            <Input
              value={measurements}
              onChange={(event) => setMeasurements(event.target.value)}
              placeholder="Hold error, lock time, voltage…"
            />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Save run</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
