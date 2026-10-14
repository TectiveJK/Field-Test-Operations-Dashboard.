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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ISSUE_SEVERITIES, type IssueSeverity } from "@/lib/types";
import { useOps } from "@/lib/store";

export function LogIssueDialog() {
  const { state, addIssue } = useOps();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("MEDIUM");
  const [aircraftId, setAircraftId] = useState("none");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    addIssue({
      title: title.trim(),
      severity,
      aircraftId: aircraftId === "none" ? null : aircraftId,
      description: description.trim() || "Logged from the operations board.",
      action: action.trim() || "Assigned to the test-day crew.",
    });
    setTitle("");
    setDescription("");
    setAction("");
    setSeverity("MEDIUM");
    setAircraftId("none");
    setError("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="shrink-0" />}>
        <Plus data-icon="inline-start" />
        Log issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a field issue</DialogTitle>
          <DialogDescription>
            Capture an anomaly, inspection fail, or ops blocker for this test day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short, specific, aircraft-first"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Severity
              <Select
                value={severity}
                onValueChange={(value) => {
                  if (value) setSeverity(value as IssueSeverity);
                }}
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
              Aircraft
              <Select
                value={aircraftId}
                onValueChange={(value) => {
                  if (value) setAircraftId(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {state.aircraft
                    .filter((asset) => asset.type === "Airframe")
                    .map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            What happened
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Observed behaviour, mode, and abort if any."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Immediate action
            <Input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Hold airframe, pull logs, swap pack…"
            />
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
