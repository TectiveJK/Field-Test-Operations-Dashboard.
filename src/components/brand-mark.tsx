import { cn } from "@/lib/utils";

const src = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/tective-logo.png`;

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={src}
      alt="Tective"
      width={40}
      height={40}
      className={cn("size-10 shrink-0 rounded-full", className)}
    />
  );
}
