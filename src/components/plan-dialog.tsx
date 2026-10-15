"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { todayIso } from "@/lib/format";
import { useHub } from "@/lib/store";
import { UPCOMING_APP_URL, type UpcomingKind } from "@/lib/upcoming";
import type { PlanItem } from "@/lib/types";

type PlanDialogProps = {
  mode: "add" | "edit";
  item?: PlanItem;
  defaultKind?: UpcomingKind;
};

export function PlanDialog({ mode, item, defaultKind = "flight" }: PlanDialogProps) {
  const { state, savePlanEntry } = useHub();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<UpcomingKind>(item?.kind ?? defaultKind);
  const [title, setTitle] = useState(item?.title ?? "");
  const [date, setDate] = useState(item?.date ?? todayIso());
  const [time, setTime] = useState(item?.window ?? "09:00");
  const [owner, setOwner] = useState(item?.owner ?? state.operator);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setKind(item?.kind ?? defaultKind);
    setTitle(item?.title ?? "");
    setDate(item?.date ?? todayIso());
    setTime(item?.window ?? "09:00");
    setOwner(item?.owner || state.operator);
    setNotes(item?.notes ?? "");
    setError("");
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await savePlanEntry({
        id: mode === "edit" ? item?.id : undefined,
        kind,
        title,
        date,
        time,
        owner,
        notes,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that flight or test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={mode === "add" ? "default" : "outline"}
            size="sm"
            className={mode === "add" ? undefined : "bg-white"}
          />
        }
      >
        {mode === "add" ? <Plus data-icon="inline-start" /> : <Pencil data-icon="inline-start" />}
        {mode === "add" ? (defaultKind === "flight" ? "Add flight" : "Add test") : "Edit"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add to the board" : "Edit board item"}</DialogTitle>
          <DialogDescription>
            Saves to the same Upcoming flights & tests board. Phones and that app see it too.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            {(["flight", "test"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={kind === option ? "default" : "outline"}
                onClick={() => setKind(option)}
              >
                {option === "flight" ? "Flight" : "Test"}
              </Button>
            ))}
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Name
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={kind === "flight" ? "e.g. TALON with ESS" : "e.g. Arctus motor flight test"}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Date
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Time
              <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Owner
            <Input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Who is flying or testing"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Note
            <FieldTextarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <a href={UPCOMING_APP_URL} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
            Open Upcoming flights & tests
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Add to board" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
