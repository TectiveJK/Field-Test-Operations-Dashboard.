"use client";

import { useMemo, useState } from "react";
import { HardwareDialog } from "@/components/hardware-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildById } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { DRONE_STATUSES, isAirframe, type Drone, type DroneStatus } from "@/lib/types";

const FLEET_SECTIONS = ["Aircraft", "Hive", "Rotator", "Batteries"] as const;
type FleetSection = (typeof FLEET_SECTIONS)[number];

function fleetSection(drone: Drone): FleetSection {
  if (drone.family === "Battery" || drone.name.toLowerCase().includes("battery")) return "Batteries";
  if (drone.family === "Ground" || drone.name.toLowerCase().includes("rotator")) return "Rotator";
  if (drone.family === "SkyHive SF" || /hive|skyfence/i.test(drone.name)) return "Hive";
  return "Aircraft";
}

export function FleetBoard() {
  const { state, setDroneStatus } = useHub();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.drones.filter((drone) => {
      return (
        !q ||
        `${drone.name} ${drone.family} ${drone.hardware} ${drone.location} ${drone.holder} ${drone.notes} ${drone.gimbal}`
          .toLowerCase()
          .includes(q)
      );
    });
  }, [state.drones, query]);

  const grouped = FLEET_SECTIONS.map((section) => ({
    section,
    items: shown.filter((drone) => fleetSection(drone) === section),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Fleet, builds & configuration</h2>
          <p className="mt-1 text-sm text-slate-600">
            Airframes, hive, rotator and batteries from the Hardware locator company list. Update a
            location here to write that same list. Phones keep using the locator app unchanged. Out
            of service is treated as grounded on airframes.
          </p>
        </div>
        <HardwareDialog mode="add" triggerVariant="default" />
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search airframe, pack, location, notes…"
        className="bg-white"
      />

      {shown.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center text-sm text-slate-600">
            No hardware matches that search.
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <section key={group.section}>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              {group.section}
              <span className="ml-2 font-normal text-slate-500">{group.items.length}</span>
            </h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((drone) => {
                const build = buildById(state, drone.buildId);
                const airframe = isAirframe(drone);
                return (
                  <Card key={drone.id} size="sm" className="bg-white">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="font-mono">{drone.name}</CardTitle>
                          <CardDescription>
                            {drone.family}
                            {drone.location ? ` · ${drone.location}` : ""}
                            {drone.hours ? ` · ${drone.hours.toFixed(1)} h` : ""}
                          </CardDescription>
                        </div>
                        {airframe ? <StatusBadge value={drone.status} /> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      {airframe ? (
                        <p className="text-xs text-slate-500">
                          {build?.label ?? "No build"}
                          {build?.jenkins ? ` · Jenkins ${build.jenkins}` : ""}
                        </p>
                      ) : null}
                      {drone.location ? (
                        <p className="text-sm font-medium text-slate-900">
                          {drone.location}
                          {drone.holder ? ` · ${drone.holder}` : ""}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">No location from Hardware locator yet.</p>
                      )}
                      {drone.gimbal ? (
                        <p className="text-xs text-slate-600">Gimbal {drone.gimbal}</p>
                      ) : null}
                      {drone.notes ? <p className="text-slate-700">{drone.notes}</p> : null}
                      <HardwareDialog
                        mode="edit"
                        itemName={drone.name}
                        location={drone.location}
                        person={drone.holder}
                        note={drone.locatorNote}
                      />
                      {airframe ? (
                        <Select
                          value={drone.status}
                          onValueChange={(value) =>
                            value && setDroneStatus(drone.id, value as DroneStatus)
                          }
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DRONE_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Software builds</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {state.builds.map((build) => (
            <Card key={build.id} size="sm" className="bg-white">
              <CardHeader>
                <CardDescription>{build.jenkins ? `Jenkins ${build.jenkins}` : "SIM packages"}</CardDescription>
                <CardTitle>{build.label}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 text-xs text-slate-600">
                <p>{build.px4}</p>
                <p>{build.skyCommand}</p>
                <p>{build.skyHive}</p>
                <p>{build.gcs}</p>
                <p>{build.autonomyNode}</p>
                <p className="pt-1 text-slate-700">{build.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
