"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  FileText,
  LayoutGrid,
  Menu,
  RotateCcw,
} from "lucide-react";
import { LogIssueDialog } from "@/components/log-issue-dialog";
import { OfflineBanner } from "@/components/offline-banner";
import { WeatherWidget } from "@/components/weather-widget";
import { forceAppUpdate, PwaRegister } from "@/components/pwa-register";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNow } from "@/lib/clock";
import { formatClock } from "@/lib/format";
import { openIssues } from "@/lib/selectors";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

const nav = [
  { href: "/", label: "Today", icon: LayoutGrid },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/tests", label: "Tests", icon: Activity },
  { href: "/fleet", label: "Fleet", icon: Cpu },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/deploy", label: "Deploy", icon: ClipboardCheck },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, reset } = useHub();
  const now = useNow();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = openIssues(state).length;

  return (
    <div className="flex min-h-full bg-[var(--ops-canvas)]">
      <PwaRegister />
      <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-slate-300/80 bg-[#eef1f5] md:flex">
        <div className="border-b border-slate-300/80 px-4 py-5">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500">TECTIVE</p>
          <h1 className="mt-1 text-base font-semibold leading-tight text-slate-900">
            Field Test Operations
          </h1>
          <p className="mt-1 text-xs text-slate-600">Daily hub · SkyCommand / PX4 / ReFly</p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">v{APP_VERSION}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/80",
                  active && "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.href === "/issues" && open > 0 ? (
                  <span className="ml-auto rounded-full bg-red-600/10 px-1.5 text-[11px] font-semibold text-red-800">
                    {open}
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
            onClick={() => {
              reset();
              void forceAppUpdate();
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Reset to source apps
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <OfflineBanner />
        <header className="sticky top-0 z-20 border-b border-slate-300/80 bg-[#f3f4f6]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-5">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="icon" className="bg-white md:hidden" />
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
                        className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white"
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="px-3 pt-3">
                  <p className="mb-2 font-mono text-[11px] text-slate-500">v{APP_VERSION}</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white"
                    onClick={() => {
                      setMenuOpen(false);
                      reset();
                      void forceAppUpdate();
                    }}
                  >
                    <RotateCcw data-icon="inline-start" />
                    Reset to source apps
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{state.site}</p>
                <StatusBadge value={state.decision} />
              </div>
              <p className="truncate text-xs text-slate-600">
                {[state.operator, state.builds.at(-1)?.label, state.weather].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-[11px] font-medium text-slate-900 sm:text-sm">
                {now ? formatClock(now) : "—"}
              </p>
              <WeatherWidget />
              <p className="font-mono text-[11px] text-slate-500">v{APP_VERSION}</p>
            </div>
            <LogIssueDialog />
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-300 bg-[#f3f4f6] md:hidden">
          {nav.slice(0, 5).map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600",
                  active && "text-blue-700"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
