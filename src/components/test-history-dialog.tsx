"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { donePlanHistory, droneById, planLabel } from "@/lib/selectors";
import { useHub } from "@/lib/store";

export function TestHistoryDialog() {
  const { state } = useHub();
  const history = donePlanHistory(state);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="bg-white" />}>
        <History data-icon="inline-start" />
        Test history
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Test history</DialogTitle>
          <DialogDescription>
            Flights and tests marked Done after their day has passed. Status is ticked on Plan.
          </DialogDescription>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="py-6 text-sm text-slate-600">
            No completed flights or tests yet. After a day has passed, items marked Done on Plan
            show up here.
          </p>
        ) : (
          <ul className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
            {history.map((item) => {
              const drone = droneById(state, item.droneId);
              return (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500">
                        {item.date} {item.window}
                      </span>{" "}
                      {planLabel(item, state)}
                    </p>
                    <StatusBadge value={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.kind === "flight" ? "Flight" : "Test"}
                    {item.owner ? ` · ${item.owner}` : ""}
                    {drone ? ` · ${drone.name}` : ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
