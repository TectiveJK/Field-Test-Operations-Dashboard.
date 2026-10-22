"use client";

import { ExportPdfButton } from "@/components/export-pdf-button";
import { HardwareDialog } from "@/components/hardware-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClock } from "@/lib/format";
import { useHub } from "@/lib/store";

export function DeployBoard() {
  const { state, toggleCheck } = useHub();
  const groups = [...new Set(state.checklist.map((item) => item.group))];
  const remaining = state.checklist.filter((item) => !item.done).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">Field deployment checklist</h2>
          <p className="mt-1 text-sm text-slate-600">
            Aircraft and packs from the Flight Test Reporter equipment list, with live locations
            from the Hardware locator. Update a location here and the locator app updates too.
            Nothing is pre-ticked. Timestamps stay on this device.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-800">
            {remaining === 0 ? "Checklist complete." : `${remaining} items still open.`}
          </p>
        </div>
        <ExportPdfButton page="deploy" />
      </div>

      {groups.map((group) => (
        <Card key={group} className="bg-white">
          <CardHeader className="border-b">
            <CardTitle>{group}</CardTitle>
            <CardDescription>
              {state.checklist.filter((item) => item.group === group && item.done).length}/
              {state.checklist.filter((item) => item.group === group).length} done
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {state.checklist
                .filter((item) => item.group === group)
                .map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <Button
                      variant={item.done ? "secondary" : "outline"}
                      size="sm"
                      className="mt-0.5 min-w-16"
                      onClick={() => toggleCheck(item.id)}
                    >
                      {item.done ? "Done" : "Tick"}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <p className={item.done ? "text-sm text-slate-500 line-through" : "text-sm font-medium"}>
                        {item.label}
                      </p>
                      {item.location ? (
                        <p
                          className={
                            item.location.toLowerCase() === "out of service"
                              ? "text-xs font-medium text-red-800"
                              : "text-xs text-slate-600"
                          }
                        >
                          {item.location}
                          {item.holder ? ` · ${item.holder}` : ""}
                        </p>
                      ) : null}
                      {item.done && item.at ? (
                        <p className="text-xs text-slate-500">
                          {item.by} · {formatClock(new Date(item.at))}
                        </p>
                      ) : (
                        <StatusBadge tone="watch">Open</StatusBadge>
                      )}
                      {item.group === "Aircraft" ||
                      item.group === "Batteries" ||
                      item.label.toLowerCase().includes("rotator") ? (
                        <div className="mt-2">
                          <HardwareDialog
                            mode="edit"
                            itemName={item.label}
                            location={item.location}
                            person={item.holder}
                            note={item.locatorNote}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
