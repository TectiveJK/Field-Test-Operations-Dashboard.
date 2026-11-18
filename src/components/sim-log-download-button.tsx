"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadSimLog } from "@/lib/sim-import";

export function SimLogDownloadButton({
  rel,
  filename,
}: {
  rel: string;
  filename: string;
}) {
  if (!rel) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="bg-white"
      onClick={() => {
        void downloadSimLog(rel, filename).catch(() => {
          window.alert(
            "Could not download that log. Leave SIM Flight Testing running on this computer.",
          );
        });
      }}
    >
      <Download data-icon="inline-start" />
      Download
    </Button>
  );
}
