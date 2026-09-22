"use client";

import { generateInsights } from "@/lib/insights";
import type { SpendRecord } from "@/lib/types";

const TONE = {
  positive: { icon: "▲", className: "text-teal-700 bg-teal-50 border-teal-100" },
  negative: { icon: "▼", className: "text-red-700 bg-red-50 border-red-100" },
  neutral: { icon: "•", className: "text-slate-600 bg-slate-50 border-slate-100" },
} as const;

export function InsightsPanel({ rows }: { rows: SpendRecord[] }) {
  const insights = generateInsights(rows);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Insights</h3>
      <p className="mt-0.5 mb-3 text-xs text-slate-500">
        Generated from the current selection. Comparisons need at least two records per group.
      </p>

      {insights.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg bg-slate-50">
          <p className="text-sm text-slate-400">No insights for the current selection</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {insights.map((insight) => {
            const tone = TONE[insight.tone];
            return (
              <li
                key={insight.id}
                className={`flex gap-2.5 rounded-lg border p-3 ${tone.className}`}
              >
                <span aria-hidden className="mt-0.5 text-xs">
                  {tone.icon}
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">{insight.headline}</p>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-80">{insight.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
