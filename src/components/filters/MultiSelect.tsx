"use client";

import { useEffect, useRef, useState } from "react";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = searchable
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <span className="truncate">
          {selected.length === 0 ? (
            <span className="text-slate-400">All</span>
          ) : selected.length === 1 ? (
            selected[0]
          ) : (
            `${selected.length} selected`
          )}
        </span>
        <span className="shrink-0 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-[220px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="mb-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
            />
          )}

          <div className="max-h-56 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-slate-400">No matches</p>
            )}
            {visible.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
