"use client";

import Link from "next/link";
import { useState } from "react";
import { PlanDialog } from "@/components/plan-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  droneById,
  planLabel,
  questionThreeIssues,
  questionThreePlan,
  upcomingPlan,
} from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { UPCOMING_APP_URL } from "@/lib/upcoming";
import { PLAN_STATUSES, type PlanItem, type PlanStatus } from "@/lib/types";

export function PlanBoard() {
  const { state, setPlanStatus, removePlanEntry } = useHub();
  const plan = upcomingPlan(state);
  const nextPlan = questionThreePlan(state);
  const nextIssues = questionThreeIssues(state);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string, title: string) {
    if (!window.confirm(`Remove “${title}” from the shared Upcoming board?`)) return;
    setRemoving(id);
    setError("");
    try {
      await removePlanEntry(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that item.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Upcoming flights and tests</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add, edit or remove items here. They write the same live board as{" "}
              <a className="underline" href={UPCOMING_APP_URL} target="_blank" rel="noreferrer">
                Upcoming flights & tests
              </a>
              . Tick status here as you go.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PlanDialog mode="add" defaultKind="flight" />
            <PlanDialog mode="add" defaultKind="test" />
          </div>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {plan.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-12 text-center text-sm text-slate-600">
              The Upcoming flights board has nothing still dated today or later. Skipped items from
              earlier days are listed below.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {plan.map((item) => (
              <PlanItemCard
                key={item.id}
                item={item}
                removing={removing}
                onRemove={() => void remove(item.id, item.title)}
                onStatus={(status) => setPlanStatus(item.id, status)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">What should we test next?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Same list as Today question 3: skipped flights and tests, plus any retest that is not
              still on the Upcoming board above.
            </p>
          </div>
          <PlanDialog mode="add" defaultKind="test" />
        </div>

        {nextPlan.length === 0 && nextIssues.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-12 text-center text-sm text-slate-600">
              Nothing extra from Today question 3. Upcoming items above are the live board.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {nextPlan.map((item) => (
              <PlanItemCard
                key={item.id}
                item={item}
                removing={removing}
                onRemove={() => void remove(item.id, item.title)}
                onStatus={(status) => setPlanStatus(item.id, status)}
              />
            ))}
            {nextIssues.map((action) => (
              <Card key={action.title} className="bg-white">
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>{action.title}</CardTitle>
                      <CardDescription>{action.why}</CardDescription>
                    </div>
                    <StatusBadge
                      tone={
                        action.priority === "now"
                          ? "fail"
                          : action.priority === "blocked"
                            ? "watch"
                            : "pending"
                      }
                    >
                      {action.priority}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button variant="outline" className="bg-white" nativeButton={false} render={<Link href={action.href} />}>
                    Open issues
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlanItemCard({
  item,
  removing,
  onRemove,
  onStatus,
}: {
  item: PlanItem;
  removing: string | null;
  onRemove: () => void;
  onStatus: (status: PlanStatus) => void;
}) {
  const { state } = useHub();
  const drone = droneById(state, item.droneId);
  return (
    <Card className="bg-white">
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
              {item.owner ? ` · ${item.owner}` : ""}
              {drone ? ` · ${drone.name}` : ""}
            </CardDescription>
          </div>
          <StatusBadge value={item.status} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4 sm:grid-cols-[1fr_12rem]">
        <div className="grid gap-3">
          <p className="text-sm text-slate-800">{item.notes || "No extra note on the board."}</p>
          <div className="flex flex-wrap gap-2">
            <PlanDialog mode="edit" item={item} />
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              disabled={removing === item.id}
              onClick={onRemove}
            >
              {removing === item.id ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
        <label className="grid h-fit gap-1 text-sm font-medium">
          Status
          <Select value={item.status} onValueChange={(value) => value && onStatus(value as PlanStatus)}>
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
}
