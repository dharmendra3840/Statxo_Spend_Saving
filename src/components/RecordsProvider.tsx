"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RecordsContext, apiFetch, type RecordsState } from "@/lib/useRecords";
import type { RecordInput, SpendRecord } from "@/lib/types";
import { useToast } from "./Toast";

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<SpendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await apiFetch<SpendRecord[]>("/api/records"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createRecord = useCallback(
    async (input: RecordInput) => {
      const created = await apiFetch<SpendRecord>("/api/records", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setRecords((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      push(`Record #${created.id} added`, "success");
      return created;
    },
    [push],
  );

  const updateRecord = useCallback<RecordsState["updateRecord"]>(
    async (id, patch) => {
      // Optimistic: apply locally first so the cell, its row's derived columns
      // and every KPI move immediately. Roll back if the request fails.
      const before = records;
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const budget = patch.budget ?? r.budget;
          const actualSpend = patch.actualSpend ?? r.actualSpend;
          return {
            ...r,
            ...patch,
            budget,
            actualSpend,
            savings: budget - actualSpend,
            savingsPct: budget > 0 ? ((budget - actualSpend) / budget) * 100 : null,
            status: actualSpend > budget ? "Over Budget" : "Approved",
          };
        }),
      );

      try {
        const updated = await apiFetch<SpendRecord>(`/api/records/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        // Replace with the server's version so client and database cannot drift.
        setRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
        push(`Record #${id} updated`, "success");
        return updated;
      } catch (e) {
        setRecords(before);
        push(e instanceof Error ? e.message : "Update failed", "error");
        throw e;
      }
    },
    [records, push],
  );

  const deleteRecord = useCallback(
    async (id: number) => {
      const before = records;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try {
        await apiFetch<{ id: number }>(`/api/records/${id}`, { method: "DELETE" });
        push(`Record #${id} deleted`, "success");
      } catch (e) {
        setRecords(before);
        push(e instanceof Error ? e.message : "Delete failed", "error");
        throw e;
      }
    },
    [records, push],
  );

  const value = useMemo<RecordsState>(
    () => ({ records, loading, error, reload, createRecord, updateRecord, deleteRecord }),
    [records, loading, error, reload, createRecord, updateRecord, deleteRecord],
  );

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}
