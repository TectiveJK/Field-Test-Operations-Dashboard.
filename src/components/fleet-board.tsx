"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { useOps } from "@/lib/store";
import { ASSET_STATUSES, type AssetStatus, type BatteryHealth } from "@/lib/types";

function assetTone(status: AssetStatus) {
  if (status === "Ready") return "pass" as const;
  if (status === "In use") return "pending" as const;
  if (status === "Hold" || status === "Inspection due") return "watch" as const;
  return "fail" as const;
}

function batteryTone(health: BatteryHealth) {
  if (health === "Good") return "pass" as const;
  if (health === "Watch") return "watch" as const;
  return "fail" as const;
}

export function FleetBoard() {
  const { state } = useOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const airframes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.aircraft.filter((asset) => {
      const matchesQuery =
        !q ||
        `${asset.name} ${asset.category} ${asset.notes} ${asset.firmware ?? ""}`
          .toLowerCase()
          .includes(q);
      const matchesStatus = status === "all" || asset.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [state.aircraft, query, status]);

  const batteries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.batteries.filter((battery) => {
      return !q || `${battery.label} ${battery.notes}`.toLowerCase().includes(q);
    });
  }, [state.batteries, query]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Fleet and equipment</h2>
        <p className="mt-1 text-sm text-slate-600">
          Refly IBB/SF, Skyhive, rotator 25, and the test-battery rack used by the Flight Test
          Reporter and Maintenance Assistant.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search airframe, firmware, pack…"
            className="bg-white pl-8"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value);
          }}
        >
          <SelectTrigger className="w-full bg-white sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ASSET_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Airframes and ground kit</h3>
        {airframes.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-10 text-center text-sm text-slate-600">
              No equipment matches that search. Try a tail number such as refly-ibb-010.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {airframes.map((asset) => (
              <Card key={asset.id} size="sm" className="bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-mono">{asset.name}</CardTitle>
                      <CardDescription>
                        {asset.category}
                        {asset.hours != null ? ` · ${asset.hours.toFixed(1)} h` : ""}
                      </CardDescription>
                    </div>
                    <StatusBadge tone={assetTone(asset.status)}>{asset.status}</StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-1 text-sm text-slate-700">
                  {asset.firmware ? (
                    <p className="font-mono text-xs text-slate-500">{asset.firmware}</p>
                  ) : null}
                  <p>{asset.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Battery rack</h3>
        {batteries.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="py-10 text-center text-sm text-slate-600">
              No packs match that search.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b px-4 py-2 text-xs font-medium text-slate-500 sm:grid-cols-[1.2fr_1fr_auto_auto_1.4fr]">
              <span>Pack</span>
              <span className="hidden sm:block">Assigned</span>
              <span>Cycles</span>
              <span>Health</span>
              <span className="hidden sm:block">Notes</span>
            </div>
            {batteries.map((battery) => (
              <div
                key={battery.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-4 py-3 last:border-0 sm:grid-cols-[1.2fr_1fr_auto_auto_1.4fr]"
              >
                <div>
                  <p className="font-mono text-sm font-medium">{battery.label}</p>
                  <p className="text-xs text-slate-500">{battery.voltage}</p>
                </div>
                <p className="hidden text-sm text-slate-700 sm:block">
                  {battery.assignedTo ?? "Unassigned"}
                </p>
                <p className="font-mono text-sm">{battery.cycles}</p>
                <StatusBadge tone={batteryTone(battery.health)}>{battery.health}</StatusBadge>
                <p className="hidden text-xs text-slate-600 sm:block">{battery.notes}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
