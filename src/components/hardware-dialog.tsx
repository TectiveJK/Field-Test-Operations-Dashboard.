"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
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
import { HARDWARE_APP_URL, HARDWARE_LOCATIONS, isPresetLocation } from "@/lib/hardware";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";

type HardwareDialogProps = {
  mode: "edit" | "add";
  itemName?: string;
  location?: string;
  person?: string;
  note?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerClassName?: string;
};

export function HardwareDialog({
  mode,
  itemName = "",
  location = "",
  person = "",
  note = "",
  triggerLabel,
  triggerVariant = "outline",
  triggerClassName,
}: HardwareDialogProps) {
  const { state, saveHardware, addHardwareItem } = useHub();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(itemName);
  const [place, setPlace] = useState(location);
  const [custom, setCustom] = useState(location && !isPresetLocation(location) ? location : "");
  const [who, setWho] = useState(person || state.operator);
  const [remark, setRemark] = useState(note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setName(itemName);
    setPlace(location);
    setCustom(location && !isPresetLocation(location) ? location : "");
    setWho(person || state.operator);
    setRemark(note);
    setError("");
  }

  async function submit() {
    const hardwareName = (mode === "add" ? name : itemName).trim();
    const nextLocation = (isPresetLocation(place) ? place : custom.trim() || place).trim();
    if (!hardwareName) {
      setError("Type a hardware name.");
      return;
    }
    if (!nextLocation) {
      setError("Choose a location.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (mode === "add") {
        await addHardwareItem({
          name: hardwareName,
          location: nextLocation,
          person: who.trim(),
          note: remark.trim(),
        });
      } else {
        await saveHardware({
          item: hardwareName,
          location: nextLocation,
          person: who.trim(),
          note: remark.trim(),
        });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
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
          <Button variant={triggerVariant} size="sm" className={cn("bg-white", triggerClassName)} />
        }
      >
        {mode === "add" ? <Plus data-icon="inline-start" /> : <MapPin data-icon="inline-start" />}
        {triggerLabel ?? (mode === "add" ? "Add hardware" : "Update location")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add hardware" : `Move ${itemName}`}</DialogTitle>
          <DialogDescription>
            Saves to the same company list the Hardware locator uses. Phones still see it there.
            The locator app itself is not changed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
          {mode === "add" ? (
            <label className="grid gap-1 text-sm font-medium">
              Name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. refly-sf-034 or battery 121"
              />
            </label>
          ) : (
            <p className="font-mono text-sm font-medium">{itemName}</p>
          )}
          <div className="grid gap-2">
            <p className="text-sm font-medium">Location</p>
            <div className="grid grid-cols-2 gap-2">
              {HARDWARE_LOCATIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={place === option ? "default" : "outline"}
                  className="h-auto min-h-10 whitespace-normal"
                  onClick={() => {
                    setPlace(option);
                    setCustom("");
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
            <Input
              value={custom}
              onChange={(event) => {
                setCustom(event.target.value);
                setPlace(event.target.value);
              }}
              placeholder="Other location"
            />
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Who has it
            <Input value={who} onChange={(event) => setWho(event.target.value)} placeholder="Your name" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Note
            <FieldTextarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Optional note"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <a
            href={HARDWARE_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-500 underline"
          >
            Open Hardware locator
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Add hardware" : "Save location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
