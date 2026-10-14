import type { FlightResult, GoDecision, IssueSeverity } from "@/lib/types";

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

export function resultTone(result: FlightResult | "PASS WITH OBSERVATIONS") {
  switch (result) {
    case "Pass":
      return "pass";
    case "Pass with observations":
    case "PASS WITH OBSERVATIONS":
      return "watch";
    case "Fail":
    case "Aborted":
      return "fail";
    default:
      return "pending";
  }
}

export function decisionTone(decision: GoDecision) {
  if (decision === "GO") return "pass";
  if (decision === "CONDITIONAL") return "watch";
  return "fail";
}

export function severityTone(severity: IssueSeverity) {
  if (severity === "CRITICAL" || severity === "HIGH") return "fail";
  if (severity === "MEDIUM") return "watch";
  return "pending";
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
