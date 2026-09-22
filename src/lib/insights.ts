import { groupBy, type Group } from "./kpi";
import { fmtINRCompact, fmtPct, fmtSignedINR } from "./format";
import type { SpendRecord } from "./types";

export type Insight = {
  id: string;
  headline: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
};

/**
 * Minimum records per group before that group may take part in a comparative
 * rate insight.
 *
 * With 20 records spread across 16 categories and 19 vendors, most groups are a
 * single row, and a single row's savings rate will almost always be the extreme
 * value. Quoting "best category" off an n=1 group is cherry-picking, not a
 * finding. Groups below this threshold are named as excluded rather than
 * silently dropped.
 */
const MIN_GROUP = 2;

const withCount = (n: number) => `${n} record${n === 1 ? "" : "s"}`;

function eligible(groups: Group[]): Group[] {
  return groups.filter((g) => g.count >= MIN_GROUP && g.savingsPct !== null);
}

function bySavingsPctDesc(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => (b.savingsPct ?? 0) - (a.savingsPct ?? 0));
}

/**
 * Every statement is generated from the filtered rows. Nothing is hardcoded --
 * including comparative clauses, which are only emitted when the comparison
 * actually holds for the current selection.
 */
export function generateInsights(rows: SpendRecord[]): Insight[] {
  if (rows.length === 0) return [];

  const out: Insight[] = [];
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualSpend, 0);
  const totalSavings = totalBudget - totalActual;
  const pct = totalBudget > 0 ? (totalSavings / totalBudget) * 100 : null;

  // 1. Overall position
  if (pct !== null) {
    out.push({
      id: "overall",
      tone: totalSavings >= 0 ? "positive" : "negative",
      headline:
        totalSavings >= 0
          ? `${fmtINRCompact(totalSavings)} saved — ${fmtPct(pct)} under budget`
          : `${fmtINRCompact(Math.abs(totalSavings))} overspent — ${fmtPct(Math.abs(pct))} over budget`,
      detail: `Across ${withCount(rows.length)} totalling ${fmtINRCompact(totalBudget)} of budget.`,
    });
  }

  // 2. Best-performing business unit (rate, so minimum group size applies)
  const bus = bySavingsPctDesc(eligible(groupBy(rows, (r) => r.businessUnit)));
  if (bus.length >= 1) {
    const best = bus[0];
    const smallest = [...groupBy(rows, (r) => r.businessUnit)].sort(
      (a, b) => a.budget - b.budget,
    )[0];
    // Only claim "despite being smallest" when it is actually true right now.
    const clause =
      smallest && smallest.key === best.key && bus.length > 1
        ? ", despite holding the smallest budget"
        : "";
    out.push({
      id: "best-bu",
      tone: "positive",
      headline: `${best.key} has the highest savings rate at ${fmtPct(best.savingsPct!)}`,
      detail: `${withCount(best.count)}, ${fmtINRCompact(best.budget)} budget${clause}.`,
    });
  }

  // 3. Overspend concentration
  const over = rows.filter((r) => r.actualSpend > r.budget);
  if (over.length > 0) {
    const overspend = over.reduce((s, r) => s + (r.actualSpend - r.budget), 0);
    out.push({
      id: "overspend",
      tone: "negative",
      headline: `${over.length} of ${rows.length} records exceeded budget`,
      detail: `${fmtPct((over.length / rows.length) * 100)} of records, ${fmtINRCompact(
        overspend,
      )} over in total. Largest: ${over
        .slice()
        .sort((a, b) => b.actualSpend - b.budget - (a.actualSpend - a.budget))[0]
        .vendor}.`,
    });
  } else {
    out.push({
      id: "overspend",
      tone: "positive",
      headline: "No records exceeded their budget",
      detail: `All ${withCount(rows.length)} came in at or under budget.`,
    });
  }

  // 4. Weakest category. Single-record groups are allowed here because this is an
  //    extreme-value statement, not a rate comparison -- but the count is stated
  //    inline so the reader can weigh it.
  const cats = groupBy(rows, (r) => r.category).filter((g) => g.savingsPct !== null);
  if (cats.length >= 2) {
    const worst = bySavingsPctDesc(cats).at(-1)!;
    out.push({
      id: "worst-category",
      tone: worst.savingsPct! < 0 ? "negative" : "neutral",
      headline:
        worst.savingsPct! < 0
          ? `${worst.key} is the largest relative overrun at ${fmtPct(Math.abs(worst.savingsPct!))} over budget`
          : `${worst.key} has the thinnest savings at ${fmtPct(worst.savingsPct!)}`,
      detail: `${withCount(worst.count)}, ${fmtINRCompact(worst.budget)} budget.`,
    });
  }

  // 5. Largest single line
  const biggest = rows.slice().sort((a, b) => b.actualSpend - a.actualSpend)[0];
  if (biggest && totalActual > 0) {
    out.push({
      id: "largest-line",
      tone: "neutral",
      headline: `${biggest.category} with ${biggest.vendor} is the largest single line`,
      detail: `${fmtINRCompact(biggest.actualSpend)} — ${fmtPct(
        (biggest.actualSpend / totalActual) * 100,
      )} of all spend in this selection.`,
    });
  }

  // 6. Location spread
  const locs = bySavingsPctDesc(eligible(groupBy(rows, (r) => r.location)));
  if (locs.length >= 2) {
    const hi = locs[0];
    const lo = locs.at(-1)!;
    out.push({
      id: "location-spread",
      tone: "neutral",
      headline: `${fmtPct(hi.savingsPct! - lo.savingsPct!)} savings spread across locations`,
      detail: `${hi.key} saves ${fmtPct(hi.savingsPct!)} (${withCount(hi.count)}) while ${
        lo.key
      } ${lo.savingsPct! < 0 ? "is" : "saves"} ${
        lo.savingsPct! < 0 ? `${fmtPct(Math.abs(lo.savingsPct!))} over budget` : fmtPct(lo.savingsPct!)
      } (${withCount(lo.count)}).`,
    });
  }

  // 7. Payment method effect
  const pays = bySavingsPctDesc(eligible(groupBy(rows, (r) => r.paymentMethod)));
  if (pays.length >= 2) {
    const hi = pays[0];
    const lo = pays.at(-1)!;
    out.push({
      id: "payment-method",
      tone: "neutral",
      headline: `${hi.key} spend is better controlled than ${lo.key}`,
      detail: `${fmtPct(hi.savingsPct!)} saved on ${hi.key} (${withCount(
        hi.count,
      )}) vs ${fmtPct(lo.savingsPct!)} on ${lo.key} (${withCount(lo.count)}).`,
    });
  }

  // 8. Priority pattern, naming any group excluded for being too small.
  const allPriority = groupBy(rows, (r) => r.priority);
  const prios = bySavingsPctDesc(eligible(allPriority));
  if (prios.length >= 2) {
    const hi = prios[0];
    const lo = prios.at(-1)!;
    const excluded = allPriority.filter((g) => g.count < MIN_GROUP);
    const note = excluded.length
      ? ` ${excluded.map((g) => g.key).join(", ")} excluded — ${withCount(excluded[0].count)}.`
      : "";
    out.push({
      id: "priority",
      tone: "neutral",
      headline: `${hi.key}-priority spend saves ${fmtPct(hi.savingsPct!)} vs ${fmtPct(
        lo.savingsPct!,
      )} for ${lo.key}`,
      detail: `${withCount(hi.count)} at ${hi.key} priority, ${withCount(lo.count)} at ${
        lo.key
      }.${note}`,
    });
  }

  return out;
}

export { fmtSignedINR };
