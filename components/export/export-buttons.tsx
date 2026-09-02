"use client";

import { downloadBlob, toCsv } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButtons({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, unknown>[];
}) {
  function exportCsv() {
    const csv = toCsv(rows);
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => headers.map((key) => String(row[key] ?? ""))),
      styles: { fontSize: 8 },
    });
    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
        <Download className="h-4 w-4" /> CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => void exportExcel()}>
        <Download className="h-4 w-4" /> Excel
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => void exportPdf()}>
        <Download className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}
