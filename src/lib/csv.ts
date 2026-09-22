import type { SpendRecord } from "./types";

const HEADERS = [
  "ID",
  "Date",
  "Department",
  "Category",
  "Vendor",
  "Location",
  "Business Unit",
  "Budget",
  "Actual Spend",
  "Savings",
  "Savings %",
  "Status",
  "Priority",
  "Payment Method",
] as const;

/**
 * RFC 4180 quoting: wrap in quotes when the value contains a comma, quote or
 * newline, and escape embedded quotes by doubling them.
 *
 * This matters for this dataset specifically — "Corporate Travel Co." and
 * "Dell Technologies" are fine, but a vendor entered with a comma would
 * otherwise shift every subsequent column by one and corrupt the file silently.
 */
function cell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: SpendRecord[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.date,
        r.department,
        r.category,
        r.vendor,
        r.location,
        r.businessUnit,
        r.budget,
        r.actualSpend,
        r.savings,
        // Blank rather than "NaN" when budget is zero, consistent with the UI.
        r.savingsPct === null ? "" : r.savingsPct.toFixed(2),
        r.status,
        r.priority,
        r.paymentMethod,
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

export function downloadCsv(rows: SpendRecord[], filename = "spend-records.csv") {
  // BOM so Excel opens UTF-8 correctly — without it, the rupee sign and any
  // non-ASCII vendor name render as mojibake on a default Windows install.
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
