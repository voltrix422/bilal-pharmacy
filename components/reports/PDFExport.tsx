"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  downloadCsv,
  downloadReportPdf,
  type ReportColumn,
} from "@/lib/utils/pdf";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PDFExportProps {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  filename?: string;
  disabled?: boolean;
}

export function PDFExport({
  title,
  subtitle,
  columns,
  rows,
  filename,
  disabled,
}: PDFExportProps) {
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);
  const baseName =
    filename || title.replace(/\s+/g, "-").toLowerCase() || "report";

  async function exportPdf() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    try {
      setBusy("pdf");
      await downloadReportPdf(
        {
          title,
          subtitle,
          columns,
          rows,
          pharmacyName: "Bilal Pharmacy",
        },
        `${baseName}.pdf`
      );
      toast.success("PDF downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF");
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    try {
      setBusy("csv");
      downloadCsv(columns, rows, `${baseName}.csv`);
      toast.success("CSV downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export CSV");
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={disabled || busy !== null || rows.length === 0}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPdf} disabled={busy !== null}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv} disabled={busy !== null}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
