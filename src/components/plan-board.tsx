"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { droneById, planLabel, upcomingPlan } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { PLAN_STATUSES, type PlanStatus } from "@/lib/types";

export function PlanBoard() {
  const { state, setPlanStatus } = useHub();
  const plan = upcomingPlan(state);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Upcoming flights and tests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Copied from{" "}
          <a
            className="underline"
            href="https://tectivejk.github.io/Upcoming-Test-Flights/"
            target="_blank"
            rel="noreferrer"
          >
            Upcoming flights & tests
          </a>
          . Tick status here as you go. Add or remove entries on that board.
        </p>
      </div>

      {plan.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-sm text-slate-600">
            The Upcoming flights board is empty.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {plan.map((item) => {
            const drone = droneById(state, item.droneId);
            return (
              <Card key={item.id} className="bg-white">
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>
                        <span className="font-mono text-sm text-slate-500">
                          {item.date} {item.window}
                        </span>{" "}
                        {planLabel(item, state)}
                      </CardTitle>
                      <CardDescription>
                        {item.kind === "flight" ? "Flight" : "Test"}
                        {drone ? ` · ${drone.name}` : ""}
                      </CardDescription>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 pt-4 sm:grid-cols-[1fr_12rem]">
                  <div>
                    <p className="text-sm text-slate-800">
                      {item.notes || "No extra note on the board."}
                    </p>
                  </div>
                  <label className="grid h-fit gap-1 text-sm font-medium">
                    Status
                    <Select
                      value={item.status}
                      onValueChange={(value) => value && setPlanStatus(item.id, value as PlanStatus)}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
