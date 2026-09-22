"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { buildColumns, SEARCHABLE_KEYS, type UpdateFn } from "./columns";
import type { SpendRecord } from "@/lib/types";

const STORAGE_KEY = "spend-table-layout-v1";

type PersistedLayout = {
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
};

export function DataTable({
  rows,
  update,
  onDelete,
}: {
  rows: SpendRecord[];
  update: UpdateFn;
  onDelete: (r: SpendRecord) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: ["id"], right: [] });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const dragCol = useRef<string | null>(null);

  const columns = useMemo(() => buildColumns(update, onDelete), [update, onDelete]);

  // Layout is read AFTER mount, never during render. Reading localStorage in
  // render produces server HTML that disagrees with the client's first paint,
  // which React reports as a hydration mismatch and recovers from by throwing
  // the DOM away.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedLayout>;
      if (saved.columnSizing) setColumnSizing(saved.columnSizing);
      if (saved.columnOrder) setColumnOrder(saved.columnOrder);
      if (saved.columnVisibility) setColumnVisibility(saved.columnVisibility);
      if (saved.columnPinning) setColumnPinning(saved.columnPinning);
    } catch {
      // Private mode, blocked storage, or corrupt JSON: defaults are fine.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ columnSizing, columnOrder, columnVisibility, columnPinning }),
      );
    } catch {
      // Non-fatal: the table simply will not remember its layout.
    }
  }, [columnSizing, columnOrder, columnVisibility, columnPinning]);

  // Narrowing the filter can leave the viewer on a page that no longer exists.
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [rows.length, globalFilter]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnSizing, columnOrder, columnVisibility, columnPinning, pagination },
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Explicit rather than relying on the default: builds one lowercase haystack
    // per row from the text columns plus the id, so searching "12" does not
    // match every budget that happens to contain those digits.
    globalFilterFn: (row, _columnId, value) => {
      const needle = String(value).toLowerCase().trim();
      if (!needle) return true;
      const r = row.original as SpendRecord;
      return SEARCHABLE_KEYS.some((k) => String(r[k]).toLowerCase().includes(needle));
    },
  });

  const pinnedLeftOffset = (id: string) => {
    const left = table.getState().columnPinning.left ?? [];
    const idx = left.indexOf(id);
    if (idx <= 0) return 0;
    return left
      .slice(0, idx)
      .reduce((acc, colId) => acc + (table.getColumn(colId)?.getSize() ?? 0), 0);
  };

  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search records…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="relative ml-auto">
          <button
            onClick={() => setShowColumnMenu((s) => !s)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Columns ▾
          </button>
          {showColumnMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowColumnMenu(false)} />
              <div className="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <div className="max-h-72 overflow-y-auto">
                  {table.getAllLeafColumns().filter((c) => c.id !== "actions").map((column) => (
                    <label
                      key={column.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        column.getCanHide()
                          ? "cursor-pointer text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        disabled={!column.getCanHide()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      <span className="truncate">
                        {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          column.pin(column.getIsPinned() === "left" ? false : "left");
                        }}
                        className="ml-auto text-xs text-blue-600 hover:underline"
                      >
                        {column.getIsPinned() === "left" ? "Unpin" : "Pin"}
                      </button>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setColumnSizing({});
                    setColumnOrder([]);
                    setColumnVisibility({});
                    setColumnPinning({ left: ["id"], right: [] });
                  }}
                  className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50"
                >
                  Reset layout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ width: table.getTotalSize() }}>
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const pinned = header.column.getIsPinned();
                  return (
                    <th
                      key={header.id}
                      draggable={header.column.id !== "actions"}
                      onDragStart={() => (dragCol.current = header.column.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        const from = dragCol.current;
                        const to = header.column.id;
                        if (!from || from === to) return;
                        const order = columnOrder.length
                          ? [...columnOrder]
                          : table.getAllLeafColumns().map((c) => c.id);
                        order.splice(order.indexOf(to), 0, order.splice(order.indexOf(from), 1)[0]);
                        setColumnOrder(order);
                        dragCol.current = null;
                      }}
                      style={{
                        width: header.getSize(),
                        ...(pinned === "left"
                          ? { position: "sticky", left: pinnedLeftOffset(header.column.id), zIndex: 20 }
                          : {}),
                      }}
                      className={`group relative border-b border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-600 ${
                        pinned === "left" ? "bg-slate-50" : ""
                      }`}
                    >
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex w-full items-center gap-1 text-left"
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-slate-400">
                          {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? ""}
                        </span>
                      </button>

                      {header.column.getCanResize() && (
                        <span
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent group-hover:bg-blue-300"
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="px-3 py-16 text-center">
                  <p className="text-sm text-slate-500">No records match your filters</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try clearing the search or resetting the filters above.
                  </p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.getIsPinned();
                    const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          ...(pinned === "left"
                            ? { position: "sticky", left: pinnedLeftOffset(cell.column.id), zIndex: 10 }
                            : {}),
                        }}
                        className={`px-3 py-2 text-slate-700 ${align === "right" ? "text-right" : ""} ${
                          pinned === "left" ? "bg-white" : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 p-3">
        <span className="text-xs text-slate-500">
          {total === 0 ? "No records" : `Showing ${first}–${last} of ${total}`}
        </span>

        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          {[
            { label: "«", fn: () => table.setPageIndex(0), can: table.getCanPreviousPage() },
            { label: "‹", fn: () => table.previousPage(), can: table.getCanPreviousPage() },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.fn}
              disabled={!b.can}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              {b.label}
            </button>
          ))}
          <span className="px-2 text-xs text-slate-600">
            Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          {[
            { label: "›", fn: () => table.nextPage(), can: table.getCanNextPage() },
            { label: "»", fn: () => table.setPageIndex(table.getPageCount() - 1), can: table.getCanNextPage() },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.fn}
              disabled={!b.can}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
