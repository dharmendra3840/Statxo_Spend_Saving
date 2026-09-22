import { deriveStatus, savings, savingsPct } from "./calc";
import type { DbRow, RecordInput, SpendRecord } from "./types";

/**
 * The only place snake_case meets camelCase, and the only place Number() is
 * applied to the money columns.
 *
 * Postgres `numeric` is serialised to JSON as a STRING to preserve arbitrary
 * precision, so `budget` can arrive as "185000.00". Summing those without
 * coercion concatenates strings instead of adding numbers — and it does not
 * throw, it just renders nonsense. The view already casts to float8; this is the
 * second line of defence, and it also makes the mapper safe to use against a raw
 * table query.
 *
 * savings / savingsPct / status are recomputed here rather than trusted from the
 * view, so that any drift between the SQL and the TypeScript shows up as a
 * visible mismatch in development instead of a subtly wrong figure in
 * production. It also means the add-record form's live preview runs the exact
 * same code path as the table.
 */
/**
 * Normalises a date column to 'YYYY-MM-DD' whatever the driver hands us.
 *
 * PostgREST (what the app uses) returns dates as JSON strings. node-postgres
 * (what the verification script uses) parses them into JS Date objects. Both
 * paths have to produce the same string, because every date comparison in
 * lib/filter.ts is a string comparison.
 *
 * Note this formats from LOCAL date parts, not toISOString(). pg constructs a
 * DATE as local midnight; in IST (UTC+05:30) that is 18:30 the previous day in
 * UTC, so toISOString() would report 2026-01-07 for a record dated 2026-01-08 —
 * silently moving records across month boundaries in the trend charts.
 */
function toISODate(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toRecord(row: DbRow): SpendRecord {
  const budget = Number(row.budget);
  const actualSpend = Number(row.actual_spend);

  return {
    id: row.id,
    date: toISODate(row.date),
    department: row.department,
    category: row.category,
    vendor: row.vendor,
    location: row.location,
    businessUnit: row.business_unit,
    budget,
    actualSpend,
    savings: savings(budget, actualSpend),
    savingsPct: savingsPct(budget, actualSpend),
    status: deriveStatus(budget, actualSpend),
    priority: row.priority,
    paymentMethod: row.payment_method,
  };
}

/** Inverse, for writes. Status and savings are never sent — they are derived. */
export function toRow(input: RecordInput) {
  return {
    date: input.date,
    department: input.department,
    category: input.category,
    vendor: input.vendor,
    location: input.location,
    business_unit: input.businessUnit,
    budget: input.budget,
    actual_spend: input.actualSpend,
    priority: input.priority,
    payment_method: input.paymentMethod,
  };
}
