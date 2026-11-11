function ResourceTable({
  c,
  filteredRows,
  selected,
  allVisibleSelected,
  toggleSelect,
  toggleSelectAll,
  deleteOne,
  q,
  canDelete,
}) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
              />
            </th>

            {c.fields.slice(0, 6).map((f) => (
              <th key={f}>{f.replace(/([A-Z])/g, " $1")}</th>
            ))}

            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((r) => (
            <tr key={r._id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(r._id)}
                  onChange={() => toggleSelect(r._id)}
                />
              </td>

              {c.fields.slice(0, 6).map((f) => (
                <td key={f}>
                  {f === "is_available" ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${r.is_available !== false ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {r.is_available !== false ? "Available" : "Not Available"}
                    </span>
                  ) : typeof r[f] === "object" && r[f] ? (
                    r[f].name || r[f].patientId || "Linked record"
                  ) : (
                    String(r[f] ?? "—")
                  )}
                </td>
              ))}

              <td>
                {canDelete && (
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    onClick={() => deleteOne(r._id)}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}

          {filteredRows.length === 0 && (
            <tr>
              <td colSpan={c.fields.slice(0, 6).length + 2} className="px-5 py-14 text-center text-sm text-slate-500">
                {q
                  ? "No records match your search."
                  : "No records yet. Use “Add New” to create one."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ResourceTable;
