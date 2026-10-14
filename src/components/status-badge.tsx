import { Badge } from "@/components/ui/badge";
import { resultTone } from "@/lib/format";
import { cn } from "@/lib/utils";

const tones = {
  pass: "border-transparent bg-emerald-600/12 text-emerald-800",
  watch: "border-transparent bg-amber-500/15 text-amber-900",
  fail: "border-transparent bg-red-600/12 text-red-800",
  pending: "border-transparent bg-sky-600/12 text-sky-900",
  mute: "border-transparent bg-slate-500/12 text-slate-700",
} as const;

export function StatusBadge({
  value,
  tone,
  children,
  className,
}: {
  value?: string;
  tone?: keyof typeof tones;
  children?: React.ReactNode;
  className?: string;
}) {
  const resolved = tone ?? (value ? resultTone(value) : "mute");
  return (
    <Badge variant="outline" className={cn(tones[resolved], className)}>
      {children ?? value}
    </Badge>
  );
}
