"use client";

import { computeKpis } from "@/lib/kpi";
import { fmtINR, fmtPct, fmtSignedINR } from "@/lib/format";
import type { SpendRecord } from "@/lib/types";

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          tone === "positive"
            ? "text-teal-700"
            : tone === "negative"
              ? "text-red-600"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
    </div>
  );
}

export function KpiGrid({ rows }: { rows: SpendRecord[] }) {
  const k = computeKpis(rows);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Budget"
        value={fmtINR(k.totalBudget)}
        sub={`Across ${k.recordCount} record${k.recordCount === 1 ? "" : "s"}`}
      />
      <KpiCard
        label="Total Actual Spend"
        value={fmtINR(k.totalActual)}
        sub={
          k.totalBudget > 0
            ? `${fmtPct((k.totalActual / k.totalBudget) * 100)} of budget consumed`
            : "No budget in selection"
        }
      />
      <KpiCard
        label="Total Savings"
        value={fmtSignedINR(k.totalSavings)}
        tone={k.totalSavings >= 0 ? "positive" : "negative"}
        sub={k.totalSavings >= 0 ? "Budget minus actual spend" : "Spend exceeded budget"}
      />
      <KpiCard
        label="Overall Savings %"
        value={fmtPct(k.overallSavingsPct)}
        tone={(k.overallSavingsPct ?? 0) >= 0 ? "positive" : "negative"}
        sub="Ratio of sums — weighted by budget size"
      />
      <KpiCard
        label="Avg Savings % / Record"
        value={fmtPct(k.avgSavingsPctPerRecord)}
        sub="Unweighted mean — every record counts equally"
      />
      <KpiCard
        label="Total Records"
        value={String(k.recordCount)}
        sub={k.recordCount === 0 ? "No records match the filters" : "Matching current filters"}
      />
      <KpiCard
        label="Over-Budget Records"
        value={
          k.recordCount === 0 ? "—" : `${k.overBudgetCount} (${fmtPct(k.overBudgetShare, 0)})`
        }
        tone={k.overBudgetCount > 0 ? "negative" : "positive"}
        sub={
          k.overBudgetCount > 0
            ? `${fmtINR(k.totalOverspend)} over budget in total`
            : "All records within budget"
        }
      />
      <KpiCard
        label="Avg Spend / Record"
        value={fmtINR(k.avgSpendPerRecord)}
        sub="Total actual spend ÷ record count"
      />
    </div>
  );
}
