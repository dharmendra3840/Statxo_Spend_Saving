import type { Filters, SpendRecord } from "./types";
import { DEFAULT_FILTERS } from "./types";

/**
 * The single place a record is ever excluded from the working set.
 *
 * Semantics: AND across filter types, OR within a filter type. An empty array
 * means unconstrained. Every consumer — KPIs, all five charts, the insights
 * panel and the table — reads the output of this one function, which is what
 * makes them incapable of disagreeing with each other.
 *
 * Dates are compared as 'YYYY-MM-DD' strings. That ordering is identical to
 * chronological ordering, and it sidesteps timezone drift entirely: no Date
 * object is constructed, so no record can shift across a month boundary because
 * of a UTC/IST offset.
 */
export function applyFilters(records: SpendRecord[], f: Filters): SpendRecord[] {
  return records.filter(
    (r) =>
      (!f.dateFrom || r.date >= f.dateFrom) &&
      (!f.dateTo || r.date <= f.dateTo) &&
      (f.businessUnits.length === 0 || f.businessUnits.includes(r.businessUnit)) &&
      (f.categories.length === 0 || f.categories.includes(r.category)) &&
      (f.vendors.length === 0 || f.vendors.includes(r.vendor)) &&
      (f.locations.length === 0 || f.locations.includes(r.location)) &&
      (f.statuses.length === 0 || f.statuses.includes(r.status)),
  );
}

export function isDefaultFilters(f: Filters): boolean {
  return (
    f.dateFrom === DEFAULT_FILTERS.dateFrom &&
    f.dateTo === DEFAULT_FILTERS.dateTo &&
    f.businessUnits.length === 0 &&
    f.categories.length === 0 &&
    f.vendors.length === 0 &&
    f.locations.length === 0 &&
    f.statuses.length === 0
  );
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0) +
    f.businessUnits.length +
    f.categories.length +
    f.vendors.length +
    f.locations.length +
    f.statuses.length
  );
}

/** Serialise filters into the URL so a filtered view is shareable and survives reload. */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.dateFrom) p.set("from", f.dateFrom);
  if (f.dateTo) p.set("to", f.dateTo);
  if (f.businessUnits.length) p.set("bu", f.businessUnits.join("~"));
  if (f.categories.length) p.set("cat", f.categories.join("~"));
  if (f.vendors.length) p.set("ven", f.vendors.join("~"));
  if (f.locations.length) p.set("loc", f.locations.join("~"));
  if (f.statuses.length) p.set("st", f.statuses.join("~"));
  return p;
}

export function paramsToFilters(p: URLSearchParams): Filters {
  // "~" as the separator because several values legitimately contain commas
  // and spaces (e.g. "Corporate Travel Co.", "Delhi NCR").
  const list = (k: string) => {
    const v = p.get(k);
    return v ? v.split("~").filter(Boolean) : [];
  };
  return {
    dateFrom: p.get("from"),
    dateTo: p.get("to"),
    businessUnits: list("bu"),
    categories: list("cat"),
    vendors: list("ven"),
    locations: list("loc"),
    statuses: list("st"),
  };
}
