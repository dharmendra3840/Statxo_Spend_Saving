import type { Status } from "./types";

/** Savings may legitimately be negative — that is an overspend, not an error. */
export function savings(budget: number, actualSpend: number): number {
  return budget - actualSpend;
}

/**
 * Returns null rather than NaN/Infinity when budget is zero or missing.
 *
 * This is the guard that keeps "NaN%" out of the KPI cards. Budget is a
 * user-supplied number via the add form and inline editing, so zero is reachable
 * at any time, not just in theory.
 */
export function savingsPct(budget: number, actualSpend: number): number | null {
  if (!Number.isFinite(budget) || budget <= 0) return null;
  return ((budget - actualSpend) / budget) * 100;
}

/**
 * Status is derived, never stored. In the sample data every row marked
 * "Over Budget" is exactly a row where actual > budget, so this reproduces the
 * source data while staying correct after an inline edit changes either number.
 */
export function deriveStatus(budget: number, actualSpend: number): Status {
  return actualSpend > budget ? "Over Budget" : "Approved";
}

/**
 * Aggregate savings rate for a group of records: ratio of sums, not the mean of
 * the members' individual percentages.
 *
 * On the seed data the two differ (10.01% vs 9.29%). Ratio of sums is the
 * financially correct portfolio figure: a 20% saving on a 42k line should not
 * carry the same weight as a 10% saving on a 320k line.
 */
export function groupSavingsPct(totalBudget: number, totalActual: number): number | null {
  if (totalBudget <= 0) return null;
  return ((totalBudget - totalActual) / totalBudget) * 100;
}
