"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, resultTone } from "@/lib/format";
import { useOps } from "@/lib/store";

export function CampaignsBoard() {
  const { state } = useOps();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Test campaigns</h2>
        <p className="mt-1 text-sm text-slate-600">
          Field-test days in the same shape as a Drone Flight Test Reporter file: objective types,
          site, weather, and an overall result that ignores pending sorties.
        </p>
      </div>

      {state.campaigns.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center text-sm text-slate-600">
            No campaigns on file. Import a report JSON from ~/DroneTestDay to start a board.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {state.campaigns.map((campaign) => {
            const flights = state.flights.filter((flight) => flight.campaignId === campaign.id);
            const concluded = flights.filter((flight) => flight.result !== "Pending");
            const isActive = campaign.id === state.activeCampaignId;
            return (
              <Card key={campaign.id} className="bg-white">
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">{campaign.id}</span>
                        {isActive ? <StatusBadge tone="pending">Today</StatusBadge> : null}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(campaign.date)} · {campaign.site}
                      </CardDescription>
                    </div>
                    <StatusBadge tone={resultTone(campaign.overallResult)}>
                      {isActive ? campaign.decision : campaign.overallResult}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Objectives</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {campaign.objectiveType1}
                      {campaign.objectiveType2 ? ` · ${campaign.objectiveType2}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{campaign.objective}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Crew and aircraft</p>
                    <p className="mt-1 text-sm text-slate-900">{campaign.responsible}</p>
                    <p className="text-sm text-slate-600">{campaign.roboticsSoftware}</p>
                    <p className="text-sm text-slate-600">{campaign.uavCategory}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Sorties</p>
                    <p className="mt-1 font-mono text-sm text-slate-900">
                      {flights.length} logged · {concluded.length} concluded
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{campaign.weather}</p>
                    {isActive ? (
                      <p className="mt-2 text-xs text-slate-500">{campaign.decisionReason}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
