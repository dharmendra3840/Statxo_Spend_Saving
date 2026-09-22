"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { fmtINR } from "@/lib/format";

/** Numeric inline edit for Budget and Actual Spend. */
export function EditableNumberCell({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (next: number) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  function validate(raw: string): string | null {
    if (raw.trim() === "") return "Required";
    const n = Number(raw);
    if (!Number.isFinite(n)) return "Must be a number";
    if (n < 0) return "Cannot be negative";
    return null;
  }

  async function commit() {
    const message = validate(draft);
    if (message) {
      setError(message);
      return; // No request is sent while the value is invalid.
    }
    const next = Number(draft);
    if (next === value) {
      setEditing(false);
      setError(null);
      return;
    }
    setSaving(true);
    try {
      await onCommit(next);
      setEditing(false);
      setError(null);
    } catch {
      setDraft(String(value));
      setError(null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full rounded px-1 py-0.5 text-right tabular-nums transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-300"
        title="Click to edit"
      >
        {fmtINR(value)}
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        min={0}
        step="any"
        value={draft}
        disabled={saving}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(validate(e.target.value));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setError(null);
            setEditing(false);
          }
        }}
        className={`w-full rounded border px-1 py-0.5 text-right text-sm tabular-nums outline-none ${
          error ? "border-red-400 bg-red-50" : "border-blue-400"
        }`}
      />
      {error && (
        <span className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
          {error}
        </span>
      )}
    </div>
  );
}

/** Category inline edit — a select, since the value set is known. */
export function EditableCategoryCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const options = [...new Set([...CATEGORIES, value])].sort((a, b) => a.localeCompare(b));

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full truncate rounded px-1 py-0.5 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-300"
        title="Click to edit"
      >
        {value}
      </button>
    );
  }

  return (
    <select
      autoFocus
      disabled={saving}
      defaultValue={value}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
      onChange={async (e) => {
        const next = e.target.value;
        if (next === value) {
          setEditing(false);
          return;
        }
        setSaving(true);
        try {
          await onCommit(next);
        } finally {
          setSaving(false);
          setEditing(false);
        }
      }}
      className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
