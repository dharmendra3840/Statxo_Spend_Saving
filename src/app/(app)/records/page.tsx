"use client";

import { Suspense, useMemo, useState } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { DataTable } from "@/components/records/DataTable";
import { AddRecordDialog } from "@/components/records/AddRecordDialog";
import { applyFilters } from "@/lib/filter";
import { useFilters } from "@/lib/useFilters";
import { useRecords } from "@/lib/useRecords";
import { downloadCsv } from "@/lib/csv";
import type { SpendRecord } from "@/lib/types";

function RecordsInner() {
  const { records, loading, error, reload, createRecord, updateRecord, deleteRecord } = useRecords();
  const [filters, setFilters] = useFilters();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SpendRecord | null>(null);

  // The table sits downstream of the global filters: its own search, sorting
  // and pagination operate on the already-filtered set, never on raw records.
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);

  const vendors = useMemo(
    () => [...new Set(records.map((r) => r.vendor))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-sm font-semibold text-red-900">Could not load records</h2>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <button
          onClick={() => void reload()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Spend Records</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Budget, Actual Spend and Category are editable inline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            title="Export the currently filtered records"
          >
            Export CSV
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Add record
          </button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        allRecords={records}
        resultCount={filtered.length}
      />

      <DataTable rows={filtered} update={updateRecord} onDelete={setPendingDelete} />

      <AddRecordDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={createRecord}
        knownVendors={vendors}
      />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Delete record?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Record #{pendingDelete.id} — {pendingDelete.category} with {pendingDelete.vendor}.
              This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = pendingDelete;
                  setPendingDelete(null);
                  await deleteRecord(target.id).catch(() => {});
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-200" />}>
      <RecordsInner />
    </Suspense>
  );
}
