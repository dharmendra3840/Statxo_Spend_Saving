"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BUSINESS_UNITS,
  CATEGORIES,
  DEPARTMENTS,
  LOCATIONS,
  PAYMENT_METHODS,
  PRIORITIES,
} from "@/lib/constants";
import { deriveStatus, savings as calcSavings, savingsPct } from "@/lib/calc";
import { fmtPct, fmtSignedINR } from "@/lib/format";
import { recordInputSchema, fieldErrors } from "@/lib/schema";
import type { RecordInput, SpendRecord } from "@/lib/types";

const EMPTY = {
  date: "",
  department: "",
  category: "",
  vendor: "",
  location: "",
  businessUnit: "",
  budget: "",
  actualSpend: "",
  priority: "",
  paymentMethod: "",
};

export function AddRecordDialog({
  open,
  onClose,
  onCreate,
  knownVendors,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: RecordInput) => Promise<SpendRecord>;
  knownVendors: string[];
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY });
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  // Live preview. Runs the same calc functions the table and API use, so what
  // the user sees here is what gets stored.
  const preview = useMemo(() => {
    const b = Number(form.budget);
    const a = Number(form.actualSpend);
    const valid = form.budget !== "" && form.actualSpend !== "" && Number.isFinite(b) && Number.isFinite(a);
    if (!valid) return null;
    return {
      savings: calcSavings(b, a),
      pct: savingsPct(b, a), // null when budget is 0 — renders as an em dash
      status: deriveStatus(b, a),
    };
  }, [form.budget, form.actualSpend]);

  if (!open) return null;

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const candidate = {
      ...form,
      budget: form.budget === "" ? NaN : Number(form.budget),
      actualSpend: form.actualSpend === "" ? NaN : Number(form.actualSpend),
    };

    const parsed = recordInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(parsed.data as RecordInput);
      onClose();
    } catch (err) {
      const e2 = err as Error & { fields?: Record<string, string> };
      if (e2.fields) setErrors(e2.fields);
      setFormError(e2.message || "Could not save the record");
    } finally {
      setSubmitting(false);
    }
  }

  const field = (name: keyof typeof EMPTY) => errors[name];

  const Select = ({
    name,
    label,
    options,
  }: {
    name: keyof typeof EMPTY;
    label: string;
    options: readonly string[];
  }) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-slate-600">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        id={name}
        value={form[name]}
        onChange={set(name)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
          field(name) ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500"
        }`}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {field(name) && <p className="mt-1 text-xs text-red-600">{field(name)}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-record-title"
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="add-record-title" className="text-base font-semibold text-slate-900">
            Add spend record
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="mb-1 block text-xs font-medium text-slate-600">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={set("date")}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                  field("date") ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500"
                }`}
              />
              {field("date") && <p className="mt-1 text-xs text-red-600">{field("date")}</p>}
            </div>

            <Select name="department" label="Department" options={DEPARTMENTS} />
            <Select name="category" label="Category" options={CATEGORIES} />

            <div>
              <label htmlFor="vendor" className="mb-1 block text-xs font-medium text-slate-600">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                id="vendor"
                list="vendor-options"
                value={form.vendor}
                onChange={set("vendor")}
                placeholder="Select or type a new vendor"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                  field("vendor") ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500"
                }`}
              />
              <datalist id="vendor-options">
                {knownVendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              {field("vendor") && <p className="mt-1 text-xs text-red-600">{field("vendor")}</p>}
            </div>

            <Select name="location" label="Location" options={LOCATIONS} />
            <Select name="businessUnit" label="Business Unit" options={BUSINESS_UNITS} />

            <div>
              <label htmlFor="budget" className="mb-1 block text-xs font-medium text-slate-600">
                Budget (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="budget"
                type="number"
                min={0}
                step="any"
                value={form.budget}
                onChange={set("budget")}
                className={`w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-blue-100 ${
                  field("budget") ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500"
                }`}
              />
              {field("budget") && <p className="mt-1 text-xs text-red-600">{field("budget")}</p>}
            </div>

            <div>
              <label htmlFor="actualSpend" className="mb-1 block text-xs font-medium text-slate-600">
                Actual Spend (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="actualSpend"
                type="number"
                min={0}
                step="any"
                value={form.actualSpend}
                onChange={set("actualSpend")}
                className={`w-full rounded-lg border px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-blue-100 ${
                  field("actualSpend") ? "border-red-400 bg-red-50" : "border-slate-300 focus:border-blue-500"
                }`}
              />
              {field("actualSpend") && (
                <p className="mt-1 text-xs text-red-600">{field("actualSpend")}</p>
              )}
            </div>

            <Select name="priority" label="Priority" options={PRIORITIES} />
            <Select name="paymentMethod" label="Payment Method" options={PAYMENT_METHODS} />
          </div>

          {/* Calculated values — never user input */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Calculated automatically
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Savings</p>
                <p
                  className={`font-semibold tabular-nums ${
                    preview && preview.savings < 0 ? "text-red-600" : "text-teal-700"
                  }`}
                >
                  {preview ? fmtSignedINR(preview.savings) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Savings %</p>
                <p
                  className={`font-semibold tabular-nums ${
                    preview && preview.pct !== null && preview.pct < 0 ? "text-red-600" : "text-teal-700"
                  }`}
                >
                  {preview ? fmtPct(preview.pct) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="font-semibold">
                  {preview ? (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        preview.status === "Over Budget"
                          ? "bg-red-100 text-red-700"
                          : "bg-teal-100 text-teal-800"
                      }`}
                    >
                      {preview.status}
                    </span>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {submitting ? "Saving…" : "Add record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
