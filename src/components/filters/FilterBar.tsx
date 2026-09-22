"use client";

import { MultiSelect } from "./MultiSelect";
import { activeFilterCount, isDefaultFilters } from "@/lib/filter";
import { DEFAULT_FILTERS, type Filters, type SpendRecord } from "@/lib/types";
import { useFilterOptions } from "@/lib/useRecords";

export function FilterBar({
  filters,
  setFilters,
  allRecords,
  resultCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  /** Options come from ALL records, not the filtered subset — otherwise
      selecting one value would remove every other option from the dropdown. */
  allRecords: SpendRecord[];
  resultCount: number;
}) {
  const options = useFilterOptions(allRecords);
  const isDefault = isDefaultFilters(filters);
  const count = activeFilterCount(filters);

  const patch = (p: Partial<Filters>) => setFilters({ ...filters, ...p });

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.dateFrom) chips.push({ label: `From ${filters.dateFrom}`, onRemove: () => patch({ dateFrom: null }) });
  if (filters.dateTo) chips.push({ label: `To ${filters.dateTo}`, onRemove: () => patch({ dateTo: null }) });
  for (const v of filters.businessUnits)
    chips.push({ label: v, onRemove: () => patch({ businessUnits: filters.businessUnits.filter((x) => x !== v) }) });
  for (const v of filters.categories)
    chips.push({ label: v, onRemove: () => patch({ categories: filters.categories.filter((x) => x !== v) }) });
  for (const v of filters.vendors)
    chips.push({ label: v, onRemove: () => patch({ vendors: filters.vendors.filter((x) => x !== v) }) });
  for (const v of filters.locations)
    chips.push({ label: v, onRemove: () => patch({ locations: filters.locations.filter((x) => x !== v) }) });
  for (const v of filters.statuses)
    chips.push({ label: v, onRemove: () => patch({ statuses: filters.statuses.filter((x) => x !== v) }) });

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Filters
          {count > 0 && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {count} active
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {resultCount} of {allRecords.length} records
          </span>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            disabled={isDefault}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-slate-600">
            Date from
          </label>
          <input
            id="from"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => patch({ dateFrom: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-slate-600">
            Date to
          </label>
          <input
            id="to"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => patch({ dateTo: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <MultiSelect
          label="Business Unit"
          options={options.businessUnits}
          selected={filters.businessUnits}
          onChange={(v) => patch({ businessUnits: v })}
        />
        <MultiSelect
          label="Category"
          options={options.categories}
          selected={filters.categories}
          onChange={(v) => patch({ categories: v })}
          searchable
        />
        <MultiSelect
          label="Vendor"
          options={options.vendors}
          selected={filters.vendors}
          onChange={(v) => patch({ vendors: v })}
          searchable
        />
        <MultiSelect
          label="Location"
          options={options.locations}
          selected={filters.locations}
          onChange={(v) => patch({ locations: v })}
        />
        <MultiSelect
          label="Status"
          options={options.statuses}
          selected={filters.statuses}
          onChange={(v) => patch({ statuses: v })}
        />
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {chips.map((c, i) => (
            <button
              key={`${c.label}-${i}`}
              onClick={c.onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-200"
            >
              {c.label}
              <span aria-hidden className="text-slate-400">✕</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
