import { groupSavingsPct } from "./calc";
import type { SpendRecord } from "./types";

export type Kpis = {
  totalBudget: number;
  totalActual: number;
  totalSavings: number;
  /** Ratio of sums. null when there is no budget to divide by. */
  overallSavingsPct: number | null;
  /** Mean of the rows' individual percentages. Deliberately a different figure. */
  avgSavingsPctPerRecord: number | null;
  recordCount: number;
  overBudgetCount: number;
  overBudgetShare: number | null;
  totalOverspend: number;
  avgSpendPerRecord: number | null;
};

export function computeKpis(rows: SpendRecord[]): Kpis {
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualSpend, 0);

  const withPct = rows.filter((r) => r.savingsPct !== null);
  const overBudget = rows.filter((r) => r.actualSpend > r.budget);

  return {
    totalBudget,
    totalActual,
    totalSavings: totalBudget - totalActual,

    // Ratio of sums: weights each record by its budget.
    overallSavingsPct: groupSavingsPct(totalBudget, totalActual),

    // Mean of ratios: treats every record equally regardless of size. On the
    // unfiltered seed data this is 9.29% against the 10.01% above. Showing both
    // is intentional -- they answer different questions.
    avgSavingsPctPerRecord: withPct.length
      ? withPct.reduce((s, r) => s + (r.savingsPct as number), 0) / withPct.length
      : null,

    recordCount: rows.length,
    overBudgetCount: overBudget.length,
    overBudgetShare: rows.length ? (overBudget.length / rows.length) * 100 : null,
    totalOverspend: overBudget.reduce((s, r) => s + (r.actualSpend - r.budget), 0),
    avgSpendPerRecord: rows.length ? totalActual / rows.length : null,
  };
}

// --- grouping helpers shared by charts and insights -------------------------

export type Group = {
  key: string;
  budget: number;
  actual: number;
  savings: number;
  /** Ratio of sums within the group. */
  savingsPct: number | null;
  count: number;
};

export function groupBy(rows: SpendRecord[], pick: (r: SpendRecord) => string): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = pick(r);
    const g =
      map.get(key) ??
      { key, budget: 0, actual: 0, savings: 0, savingsPct: null, count: 0 };
    g.budget += r.budget;
    g.actual += r.actualSpend;
    g.count += 1;
    map.set(key, g);
  }
  for (const g of map.values()) {
    g.savings = g.budget - g.actual;
    g.savingsPct = groupSavingsPct(g.budget, g.actual);
  }
  return [...map.values()];
}

/** 'YYYY-MM' buckets, derived from the data present rather than a fixed month list. */
export function groupByMonth(rows: SpendRecord[]): Group[] {
  return groupBy(rows, (r) => r.date.slice(0, 7)).sort((a, b) => a.key.localeCompare(b.key));
}
