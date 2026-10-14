"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  LayoutGrid,
  Menu,
  Plane,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogIssueDialog } from "@/components/log-issue-dialog";
import { StatusBadge } from "@/components/status-badge";
import { useNow } from "@/lib/clock";
import { formatClock } from "@/lib/format";
import { useOps } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Operations", icon: LayoutGrid },
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/fleet", label: "Fleet", icon: Activity },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/campaigns", label: "Campaigns", icon: ClipboardList },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { today, openIssues, reset, ready } = useOps();
  const now = useNow();
  const [menuOpen, setMenuOpen] = useState(false);

  const decisionTone =
    today.decision === "GO"
      ? "pass"
      : today.decision === "CONDITIONAL"
        ? "watch"
        : "fail";

  return (
    <div className="flex min-h-full bg-[var(--ops-canvas)]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-300/80 bg-[#eef1f5] lg:flex">
        <div className="border-b border-slate-300/80 px-4 py-5">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500">
            TECTIVE
          </p>
          <h1 className="mt-1 text-base font-semibold leading-tight text-slate-900">
            Field Test Operations
          </h1>
          <p className="mt-1 text-xs text-slate-600">Drone test-day command</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/80",
                  active && "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.href === "/issues" && openIssues.length > 0 ? (
                  <span className="ml-auto rounded-full bg-red-600/10 px-1.5 text-[11px] font-semibold text-red-800">
                    {openIssues.length}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-300/80 p-3">
          <Button
            variant="outline"
            className="w-full justify-start bg-white"
            onClick={reset}
          >
            <RotateCcw data-icon="inline-start" />
            Reset test-day data
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-300/80 bg-[#f3f4f6]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="icon" className="lg:hidden bg-white" />
                }
              >
                <Menu />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[#eef1f5]">
                <SheetHeader>
                  <SheetTitle>TECTIVE</SheetTitle>
                  <SheetDescription>Field Test Operations</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-3">
                  {nav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white"
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {today.site}
                </p>
                <StatusBadge tone={decisionTone}>{today.decision}</StatusBadge>
              </div>
              <p className="truncate text-xs text-slate-600">
                {today.objectiveType1}
                {today.objectiveType2 ? ` · ${today.objectiveType2}` : ""}
                {" · "}
                {today.responsible}
              </p>
            </div>

            <div className="hidden text-right sm:block">
              <p className="font-mono text-sm font-medium text-slate-900">
                {now ? formatClock(now) : "—"}
              </p>
              <p className="text-[11px] text-slate-500">Europe/Amsterdam</p>
            </div>

            <LogIssueDialog />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-6">
          {ready ? (
            children
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
              Loading test-day board…
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
