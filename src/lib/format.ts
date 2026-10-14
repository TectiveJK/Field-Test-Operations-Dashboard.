import type { GoDecision, IssueSeverity, RunResult } from "@/lib/types";

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
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso.includes("T") ? iso : `${iso}T12:00:00Z`));
}

export function resultTone(result: RunResult | GoDecision | string) {
  switch (result) {
    case "Pass":
    case "GO":
    case "Available":
    case "Done":
    case "RESOLVED":
      return "pass" as const;
    case "Pass with observations":
    case "CONDITIONAL":
    case "Under test":
    case "IN PROGRESS":
    case "READY FOR RETEST":
    case "Watch":
      return "watch" as const;
    case "Fail":
    case "Aborted":
    case "NO-GO":
    case "Grounded":
    case "Blocked":
    case "OPEN":
    case "CRITICAL":
    case "HIGH":
      return "fail" as const;
    default:
      return "pending" as const;
  }
}

export function severityTone(severity: IssueSeverity) {
  if (severity === "CRITICAL" || severity === "HIGH") return "fail" as const;
  if (severity === "MEDIUM") return "watch" as const;
  return "pending" as const;
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
}
