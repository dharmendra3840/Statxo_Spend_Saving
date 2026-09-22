"use client";

import { createContext, useCallback, useContext } from "react";
import type { RecordInput, SpendRecord } from "./types";

/**
 * One shared records cache for the entire app.
 *
 * This is what makes "changes are reflected across the application" true by
 * construction rather than by remembering to refresh things: KPIs, all five
 * charts, the insights panel and the table all read from this single array, so
 * a mutation that updates it updates every one of them at once. There is no
 * second copy of the data anywhere.
 */
export type RecordsState = {
  records: SpendRecord[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createRecord: (input: RecordInput) => Promise<SpendRecord>;
  updateRecord: (
    id: number,
    patch: Partial<Pick<SpendRecord, "budget" | "actualSpend" | "category">>,
  ) => Promise<SpendRecord>;
  deleteRecord: (id: number) => Promise<void>;
};

export const RecordsContext = createContext<RecordsState | null>(null);

export function useRecords(): RecordsState {
  const ctx = useContext(RecordsContext);
  if (!ctx) throw new Error("useRecords must be used inside <RecordsProvider>");
  return ctx;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    const fields = body?.error?.fields as Record<string, string> | undefined;
    const err = new Error(message) as Error & { fields?: Record<string, string> };
    if (fields) err.fields = fields;
    throw err;
  }

  return body.data as T;
}

/** Filter options derived from the loaded data, so new values appear automatically. */
export function useFilterOptions(records: SpendRecord[]) {
  return useCallback(() => {
    const uniq = (pick: (r: SpendRecord) => string) =>
      [...new Set(records.map(pick))].sort((a, b) => a.localeCompare(b));
    return {
      businessUnits: uniq((r) => r.businessUnit),
      categories: uniq((r) => r.category),
      vendors: uniq((r) => r.vendor),
      locations: uniq((r) => r.location),
      departments: uniq((r) => r.department),
      statuses: ["Approved", "Over Budget"],
    };
  }, [records])();
}
