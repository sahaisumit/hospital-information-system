import React from "react";

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>Showing {first}–{last} of {total}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">Rows
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="w-auto py-1">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
