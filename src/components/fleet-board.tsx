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
import { DRONE_STATUSES, type DroneStatus } from "@/lib/types";

export function FleetBoard() {
  const { state, setDroneStatus } = useHub();
  const airframes = state.drones.filter((drone) => drone.family !== "Ground");
  const [left, setLeft] = useState(airframes[0]?.id ?? "");
  const [right, setRight] = useState(airframes[3]?.id ?? airframes[1]?.id ?? "");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.drones.filter((drone) => {
      return (
        !q ||
        `${drone.name} ${drone.family} ${drone.hardware} ${drone.location} ${drone.holder} ${drone.notes}`
          .toLowerCase()
          .includes(q)
      );
    });
  }, [state.drones, query]);

  const a = state.drones.find((drone) => drone.id === left);
  const b = state.drones.find((drone) => drone.id === right);
  const buildA = buildById(state, a?.buildId ?? null);
  const buildB = buildById(state, b?.buildId ?? null);

  const diffs = a && b
    ? [
        ["PX4", buildA?.px4, buildB?.px4],
        ["SkyCommand", buildA?.skyCommand, buildB?.skyCommand],
        ["SkyHive", buildA?.skyHive, buildB?.skyHive],
        ["QGC", buildA?.gcs, buildB?.gcs],
        ["Autonomy", buildA?.autonomyNode, buildB?.autonomyNode],
        ["Jenkins", buildA?.jenkins, buildB?.jenkins],
        ["Hardware", a.hardware, b.hardware],
        ["Location", a.location, b.location],
        ["Holder", a.holder, b.holder],
        ["Gimbal", a.gimbal, b.gimbal],
        ["Parameters", a.parameters, b.parameters],
      ] as const
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Fleet, builds & configuration</h2>
          <p className="mt-1 text-sm text-slate-600">
            Airframes from the Reporter equipment list. Update a location here to write the same
            company list the Hardware locator uses. Phones keep using that app unchanged.
            Out of service is treated as grounded.
          </p>
        </div>
        <HardwareDialog mode="add" triggerVariant="default" />
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search airframe, location, notes…"
        className="bg-white"
      />

      {shown.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-10 text-center text-sm text-slate-600">
            No drones match that search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((drone) => {
            const build = buildById(state, drone.buildId);
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
                    <StatusBadge value={drone.status} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <p className="text-xs text-slate-500">
                    {build?.label ?? "No build"}
                    {build?.jenkins ? ` · Jenkins ${build.jenkins}` : ""}
                  </p>
                  {drone.location ? (
                    <p className="text-sm font-medium text-slate-900">
                      {drone.location}
                      {drone.holder ? ` · ${drone.holder}` : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">No location from Hardware locator yet.</p>
                  )}
                  {drone.gimbal ? <p className="text-xs text-slate-600">Gimbal {drone.gimbal}</p> : null}
                  <p className="text-slate-700">{drone.notes}</p>
                  <HardwareDialog
                    mode="edit"
                    itemName={drone.name}
                    location={drone.location}
                    person={drone.holder}
                    note={drone.locatorNote}
                  />
                  {drone.family !== "Ground" ? (
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
      )}

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Compare two drones</CardTitle>
          <CardDescription>
            Compare two Reporter airframes when firmware or parameters differ.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Drone A
              <Select value={left} onValueChange={(value) => value && setLeft(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {airframes.map((drone) => (
                    <SelectItem key={drone.id} value={drone.id}>
                      {drone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Drone B
              <Select value={right} onValueChange={(value) => value && setRight(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {airframes.map((drone) => (
                    <SelectItem key={drone.id} value={drone.id}>
                      {drone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="py-2 pr-3">Field</th>
                  <th className="py-2 pr-3">{a?.name}</th>
                  <th className="py-2">{b?.name}</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map(([field, va, vb]) => (
                  <tr key={field} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-slate-500">{field}</td>
                    <td className="py-2 pr-3">{va}</td>
                    <td className={va !== vb ? "py-2 font-medium text-amber-900" : "py-2"}>
                      {vb}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
