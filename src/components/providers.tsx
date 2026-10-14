"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <StoreProvider>{children}</StoreProvider>
    </TooltipProvider>
  );
}
