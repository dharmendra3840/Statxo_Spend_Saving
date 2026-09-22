"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartTooltip } from "./ChartCard";
import { groupBy, groupByMonth } from "@/lib/kpi";
import { fmtINR, fmtINRCompact, fmtMonth } from "@/lib/format";
import {
  COLOR_BUDGET,
  COLOR_OVERSPEND,
  COLOR_SAVINGS,
  COLOR_SPEND,
  colorFor,
} from "@/lib/constants";
import type { SpendRecord } from "@/lib/types";

const axis = { fontSize: 11, fill: "#64748b" };
const tip = (n: number) => fmtINR(n);

/** 1. Line — budget vs actual spend over time. */
export function SpendTrendLine({ rows }: { rows: SpendRecord[] }) {
  const data = groupByMonth(rows).map((g) => ({
    month: fmtMonth(g.key),
    Budget: g.budget,
    "Actual Spend": g.actual,
  }));

  return (
    <ChartCard
      title="Budget vs Actual Spend"
      subtitle="Monthly totals, derived from the months present in the selection"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtINRCompact} />
          <Tooltip content={<ChartTooltip formatter={tip} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Budget" stroke={COLOR_BUDGET} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Actual Spend" stroke={COLOR_SPEND} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** 2. Bar — savings by business unit. Negative values must render below zero. */
export function SavingsByBuBar({ rows }: { rows: SpendRecord[] }) {
  const data = groupBy(rows, (r) => r.businessUnit)
    .sort((a, b) => b.savings - a.savings)
    .map((g) => ({ name: g.key, Savings: g.savings }));

  return (
    <ChartCard
      title="Savings by Business Unit"
      subtitle="Negative bars are overspend, not missing data"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval={0} angle={-20} textAnchor="end" height={55} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtINRCompact} />
          <Tooltip content={<ChartTooltip formatter={tip} />} cursor={{ fill: "#f1f5f9" }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="Savings" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.Savings >= 0 ? COLOR_SAVINGS : COLOR_OVERSPEND} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** 3. Donut — spend share by category, top 6 plus an aggregated "Other". */
export function CategoryDonut({ rows }: { rows: SpendRecord[] }) {
  const all = groupBy(rows, (r) => r.category).sort((a, b) => b.actual - a.actual);
  const top = all.slice(0, 6);
  const rest = all.slice(6);
  const data = [
    ...top.map((g) => ({ name: g.key, value: g.actual })),
    ...(rest.length
      ? [{ name: `Other (${rest.length})`, value: rest.reduce((s, g) => s + g.actual, 0) }]
      : []),
  ].filter((d) => d.value > 0);

  return (
    <ChartCard
      title="Spend Share by Category"
      subtitle="Top 6 categories by actual spend, remainder grouped"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={colorFor(d.name, i)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={tip} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/**
 * 4. Stacked bar — actual spend plus unspent budget, by department.
 *
 * Stacking [spend, savings] directly breaks as soon as a group is over budget:
 * the negative segment renders below the axis and the bar stops representing
 * the budget. Instead the stack is [spend, max(0, savings)] with any overspend
 * drawn as its own segment above the budget line, so the bar always totals
 * max(budget, spend) and an overrun reads as an overrun.
 */
export function DeptStackedBar({ rows }: { rows: SpendRecord[] }) {
  const data = groupBy(rows, (r) => r.department)
    .sort((a, b) => b.budget - a.budget)
    .map((g) => ({
      name: g.key,
      "Actual Spend": Math.min(g.actual, g.budget),
      "Unspent Budget": Math.max(0, g.savings),
      Overspend: Math.max(0, -g.savings),
    }));

  return (
    <ChartCard
      title="Spend vs Unspent Budget by Department"
      subtitle="Each bar totals the department's budget; overspend sits above it"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval={0} angle={-20} textAnchor="end" height={55} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtINRCompact} />
          <Tooltip content={<ChartTooltip formatter={tip} />} cursor={{ fill: "#f1f5f9" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Actual Spend" stackId="a" fill={COLOR_SPEND} />
          <Bar dataKey="Unspent Budget" stackId="a" fill={COLOR_SAVINGS} />
          <Bar dataKey="Overspend" stackId="a" fill={COLOR_OVERSPEND} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** 5. Area — cumulative savings over time. */
export function CumulativeSavingsArea({ rows }: { rows: SpendRecord[] }) {
  let running = 0;
  const data = groupByMonth(rows).map((g) => {
    running += g.savings;
    return { month: fmtMonth(g.key), "Cumulative Savings": running };
  });

  return (
    <ChartCard
      title="Cumulative Savings"
      subtitle="Running total of savings across the selected period"
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_SAVINGS} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLOR_SAVINGS} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtINRCompact} />
          <Tooltip content={<ChartTooltip formatter={tip} />} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Area
            type="monotone"
            dataKey="Cumulative Savings"
            stroke={COLOR_SAVINGS}
            strokeWidth={2}
            fill="url(#savingsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
