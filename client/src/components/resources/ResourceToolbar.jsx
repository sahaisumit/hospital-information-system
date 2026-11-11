import { Search } from "lucide-react";

function ResourceToolbar({ q, setQ, filteredRows, rows, departments = [], specializations = [], departmentFilter = "", setDepartmentFilter, specializationFilter = "", setSpecializationFilter }) {
  const doctorCount = departments.length ? filteredRows.filter((row) => (!departmentFilter || row.department === departmentFilter || row.department_name === departmentFilter) && (!specializationFilter || row.specialization === specializationFilter)).length : filteredRows.length;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
      <div className="flex w-full min-w-[240px] max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Search size={17}/><input value={q} onChange={(e) => setQ(e.target.value)} className="w-full border-0 bg-transparent py-2 outline-none focus:shadow-none" placeholder="Search records..."/>
      </div>
      {departments.length > 0 && <select className="w-auto" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>}
      {specializations.length > 0 && <select className="w-auto" value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}><option value="">All specialisations</option>{specializations.map((s) => <option key={s} value={s}>{s}</option>)}</select>}
      <span>{doctorCount} of {rows.length} records</span>
    </div>
  );
}

export default ResourceToolbar;
