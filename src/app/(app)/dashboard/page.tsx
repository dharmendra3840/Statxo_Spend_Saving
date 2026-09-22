"use client";

import { Suspense, useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import { InsightsPanel } from "@/components/insights/InsightsPanel";
import {
  CategoryDonut,
  CumulativeSavingsArea,
  DeptStackedBar,
  SavingsByBuBar,
  SpendTrendLine,
} from "@/components/charts/Charts";
import { applyFilters } from "@/lib/filter";
import { useFilters } from "@/lib/useFilters";
import { useRecords } from "@/lib/useRecords";

function DashboardInner() {
  const { records, loading, error, reload } = useRecords();
  const [filters, setFilters] = useFilters();

  // One derivation, consumed by the KPI grid, all five charts and the insights
  // panel. They cannot disagree with each other because they are all reading
  // the same array.
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
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
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Organisational spend, budget utilisation and savings
        </p>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        allRecords={records}
        resultCount={filtered.length}
      />

      <KpiGrid rows={filtered} />

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SpendTrendLine rows={filtered} />
        <SavingsByBuBar rows={filtered} />
        <CategoryDonut rows={filtered} />
        <DeptStackedBar rows={filtered} />
      </div>

      <div className="mt-3">
        <CumulativeSavingsArea rows={filtered} />
      </div>

      <div className="mt-4">
        <InsightsPanel rows={filtered} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-200" />}>
      <DashboardInner />
    </Suspense>
  );
}
