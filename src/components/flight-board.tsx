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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatTime, resultTone } from "@/lib/format";
import { useOps } from "@/lib/store";
import { FLIGHT_RESULTS, type FlightResult } from "@/lib/types";

export function FlightBoard() {
  const { today, todayFlights, state, setFlightResult } = useOps();
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todayFlights.filter((flight) => {
      const aircraft = state.aircraft.find((asset) => asset.id === flight.aircraftId);
      const haystack = [
        flight.number,
        flight.objective,
        flight.mission,
        flight.anomalies,
        aircraft?.name,
        flight.modes.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesResult = resultFilter === "all" || flight.result === resultFilter;
      return matchesQuery && matchesResult;
    });
  }, [todayFlights, query, resultFilter, state.aircraft]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Flight board</h2>
        <p className="mt-1 text-sm text-slate-600">
          Live sorties for {today.site}. Update a result as the crew debriefs — pending flights
          stay out of the overall campaign conclusion, matching the Flight Test Reporter.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search flight, airframe, mode, anomaly…"
            className="bg-white pl-8"
          />
        </div>
        <Select
          value={resultFilter}
          onValueChange={(value) => {
            if (value) setResultFilter(value);
          }}
        >
          <SelectTrigger className="w-full bg-white sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            {FLIGHT_RESULTS.map((result) => (
              <SelectItem key={result} value={result}>
                {result}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white">
        <CardHeader className="border-b">
          <CardTitle>
            {rows.length} of {todayFlights.length} sorties
          </CardTitle>
          <CardDescription>
            {today.objectiveType1} · {today.objectiveType2}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-900">No sorties match this filter</p>
              <p className="mt-1 text-sm text-slate-600">
                Clear search or choose All results to see the full test-day list.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flight</TableHead>
                  <TableHead>Airframe</TableHead>
                  <TableHead className="hidden md:table-cell">Objective</TableHead>
                  <TableHead className="hidden lg:table-cell">Modes</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="hidden xl:table-cell">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((flight) => {
                  const aircraft = state.aircraft.find((asset) => asset.id === flight.aircraftId);
                  const battery = state.batteries.find((item) => item.id === flight.batteryId);
                  return (
                    <TableRow key={flight.id}>
                      <TableCell>
                        <div className="font-mono text-sm font-semibold">{flight.number}</div>
                        <div className="text-xs text-slate-500">
                          {formatTime(flight.start)} · {flight.duration} · {flight.phase}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{aircraft?.name}</div>
                        <div className="text-xs text-slate-500">{battery?.label ?? "No pack"}</div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs md:table-cell">
                        <div className="text-sm">{flight.objective}</div>
                        <div className="truncate text-xs text-slate-500">{flight.mission}</div>
                        {flight.anomalies ? (
                          <div className="mt-1 text-xs text-amber-800">{flight.anomalies}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {flight.modes.map((mode) => (
                            <StatusBadge key={mode} tone="mute">
                              {mode}
                            </StatusBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid gap-1.5">
                          <StatusBadge tone={resultTone(flight.result)}>{flight.result}</StatusBadge>
                          <Select
                            value={flight.result}
                            onValueChange={(value) => {
                              if (value) setFlightResult(flight.id, value as FlightResult);
                            }}
                          >
                            <SelectTrigger size="sm" className="w-44 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FLIGHT_RESULTS.map((result) => (
                                <SelectItem key={result} value={result}>
                                  {result}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-slate-600 xl:table-cell">
                        <div>{flight.logFile ?? "No log selected"}</div>
                        <div>{flight.captureFile ?? "No capture"}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
