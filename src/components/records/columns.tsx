"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { SpendRecord } from "@/lib/types";
import { fmtDate, fmtINR, fmtPct, fmtSignedINR } from "@/lib/format";
import { EditableCategoryCell, EditableNumberCell } from "./EditableCell";

const col = createColumnHelper<SpendRecord>();

export type UpdateFn = (
  id: number,
  patch: Partial<Pick<SpendRecord, "budget" | "actualSpend" | "category">>,
) => Promise<unknown>;

export function buildColumns(update: UpdateFn, onDelete: (r: SpendRecord) => void) {
  return [
    col.accessor("id", {
      header: "ID",
      size: 80,
      enableHiding: false,
      cell: (c) => <span className="tabular-nums text-slate-500">{c.getValue()}</span>,
    }),
    col.accessor("date", {
      header: "Date",
      size: 120,
      // Sorts on the raw 'YYYY-MM-DD' string, which orders chronologically.
      // Sorting on the ID would be wrong here: 1001 is 08 Jan, 1002 is 07 Jan.
      sortingFn: "text",
      cell: (c) => <span className="whitespace-nowrap">{fmtDate(c.getValue())}</span>,
    }),
    col.accessor("department", { header: "Department", size: 130 }),
    col.accessor("category", {
      header: "Category",
      size: 170,
      cell: (c) => (
        <EditableCategoryCell
          value={c.getValue()}
          onCommit={(next) => update(c.row.original.id, { category: next })}
        />
      ),
    }),
    col.accessor("vendor", { header: "Vendor", size: 170 }),
    col.accessor("location", { header: "Location", size: 120 }),
    col.accessor("businessUnit", { header: "Business Unit", size: 130 }),
    col.accessor("budget", {
      header: "Budget",
      size: 130,
      meta: { align: "right" },
      cell: (c) => (
        <EditableNumberCell
          value={c.getValue()}
          onCommit={(next) => update(c.row.original.id, { budget: next })}
        />
      ),
    }),
    col.accessor("actualSpend", {
      header: "Actual Spend",
      size: 140,
      meta: { align: "right" },
      cell: (c) => (
        <EditableNumberCell
          value={c.getValue()}
          onCommit={(next) => update(c.row.original.id, { actualSpend: next })}
        />
      ),
    }),
    col.accessor("savings", {
      header: "Savings",
      size: 130,
      meta: { align: "right" },
      cell: (c) => {
        const v = c.getValue();
        return (
          <span className={`tabular-nums ${v < 0 ? "text-red-600" : "text-teal-700"}`}>
            {fmtSignedINR(v)}
          </span>
        );
      },
    }),
    col.accessor("savingsPct", {
      header: "Savings %",
      size: 110,
      meta: { align: "right" },
      // Zero-budget rows have a null here. Without this, nulls land in a
      // different place ascending vs descending, which reads as a sorting bug.
      sortUndefined: "last",
      cell: (c) => {
        const v = c.getValue();
        return (
          <span
            className={`tabular-nums ${
              v === null ? "text-slate-400" : v < 0 ? "text-red-600" : "text-teal-700"
            }`}
          >
            {fmtPct(v)}
          </span>
        );
      },
    }),
    col.accessor("status", {
      header: "Status",
      size: 130,
      cell: (c) => {
        const v = c.getValue();
        return (
          <span
            className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
              v === "Over Budget" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-800"
            }`}
          >
            {v}
          </span>
        );
      },
    }),
    col.accessor("priority", {
      header: "Priority",
      size: 100,
      cell: (c) => {
        const v = c.getValue();
        return (
          <span
            className={`text-xs font-medium ${
              v === "High" ? "text-slate-900" : v === "Medium" ? "text-slate-600" : "text-slate-400"
            }`}
          >
            {v}
          </span>
        );
      },
    }),
    col.accessor("paymentMethod", { header: "Payment Method", size: 150 }),
    col.display({
      id: "actions",
      header: "",
      size: 60,
      enableResizing: false,
      cell: (c) => (
        <button
          onClick={() => onDelete(c.row.original)}
          className="rounded px-2 py-0.5 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          title={`Delete record ${c.row.original.id}`}
        >
          Delete
        </button>
      ),
    }),
  ];
}

/** Columns whose values participate in the global search. */
export const SEARCHABLE_KEYS: (keyof SpendRecord)[] = [
  "id",
  "department",
  "category",
  "vendor",
  "location",
  "businessUnit",
  "status",
  "priority",
  "paymentMethod",
];
