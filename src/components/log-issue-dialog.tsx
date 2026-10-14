"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { ISSUE_SEVERITIES, isAirframe, type IssueSeverity } from "@/lib/types";
import { useHub } from "@/lib/store";

export function LogIssueDialog() {
  const { state, addIssue } = useHub();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("HIGH");
  const [droneId, setDroneId] = useState("none");
  const [missionType, setMissionType] = useState("GNSS Denied");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!title.trim() || !actual.trim()) {
      setError("Title and actual behaviour are required.");
      return;
    }
    addIssue({
      title: title.trim(),
      severity,
      droneId: droneId === "none" ? null : droneId,
      missionType,
      stepsToReproduce: steps.trim() || "See test card.",
      expected: expected.trim() || "See test case expected result.",
      actual: actual.trim(),
    });
    setTitle("");
    setSteps("");
    setExpected("");
    setActual("");
    setError("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="shrink-0" />}>
        <Plus data-icon="inline-start" />
        Log issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a bug from the field</DialogTitle>
          <DialogDescription>
            Same record the dashboard, retest queue and evidence list will use.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
          <label className="grid gap-1 text-sm font-medium">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Airframe-first, e.g. GNSS hold on skyhive-sf-004"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Severity
              <Select
                value={severity}
                onValueChange={(value) => value && setSeverity(value as IssueSeverity)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Drone
              <Select value={droneId} onValueChange={(value) => value && setDroneId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {state.drones
                    .filter(isAirframe)
                    .map((drone) => (
                      <SelectItem key={drone.id} value={drone.id}>
                        {drone.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Mission type
            <Input
              value={missionType}
              onChange={(event) => setMissionType(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Steps to reproduce
            <FieldTextarea value={steps} onChange={(event) => setSteps(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Expected
            <Input value={expected} onChange={(event) => setExpected(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Actual
            <FieldTextarea value={actual} onChange={(event) => setActual(event.target.value)} />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button onClick={submit}>Save issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
