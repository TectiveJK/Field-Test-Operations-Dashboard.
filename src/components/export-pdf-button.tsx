"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportHubPdf, type ExportPage } from "@/lib/export-pdf";
import { useHub } from "@/lib/store";

export function ExportPdfButton({ page }: { page: ExportPage }) {
  const { state, lastSim } = useHub();
  const allPages = page === "reports";

  return (
    <Button
      variant="outline"
      className="shrink-0 bg-white"
      title={allPages ? "Export every page as one PDF" : "Export this page as PDF"}
      onClick={() => exportHubPdf(page, state, lastSim)}
    >
      <FileDown data-icon="inline-start" />
      Export PDF
    </Button>
  );
}
