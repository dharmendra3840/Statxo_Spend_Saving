"use client";

export function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 mb-3 text-xs text-slate-500">{subtitle}</p>
      {empty ? (
        <div className="flex h-[260px] items-center justify-center rounded-lg bg-slate-50">
          <p className="text-sm text-slate-400">No records match the current filters</p>
        </div>
      ) : (
        <div className="h-[260px] w-full">{children}</div>
      )}
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-slate-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-slate-900">{formatter(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
