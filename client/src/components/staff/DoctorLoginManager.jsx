import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { api } from "../../lib/api";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function DoctorLoginManager({ doctors }) {
  const [users, setUsers] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const filteredDoctors = doctors.filter((item) => (!departmentFilter || item.department === departmentFilter) && (!specialtyFilter || item.specialization === specialtyFilter) && (!search.trim() || [item.name, item.department, item.specialization, item.email].some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase()))));
  const pagination = useListPagination(filteredDoctors);

  const loadUsers = async () => {
    try { setUsers(await api("/users")); }
    catch (e) { setError(e.message); }
  };

  useEffect(() => { loadUsers(); }, []);

  const provisionLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctor._id,
          name: doctor.name,
          email: email.trim().toLowerCase(),
          password,
          role: "doctor",
          phone: doctor.phone,
        }),
      });
      setCredentials({ email: email.trim().toLowerCase(), password, name: doctor.name });
      setDoctor(null);
      setPassword("");
      await loadUsers();
    } catch (e) { setError(e.message); }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Doctor sign-in accounts</h2>
        <p className="mt-1 text-sm text-slate-500">Create a login for each doctor profile. The account is linked to that doctor's appointments.</p>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-3 flex flex-wrap gap-2"><input className="min-w-[220px] flex-1" placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)}/><select className="w-auto" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="">All departments</option>{[...new Set(doctors.map((d) => d.department).filter(Boolean))].sort().map((d) => <option key={d}>{d}</option>)}</select><select className="w-auto" value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}><option value="">All specialisations</option>{[...new Set(doctors.map((d) => d.specialization).filter(Boolean))].sort().map((s) => <option key={s}>{s}</option>)}</select></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th className="p-3">Doctor</th><th className="p-3">Specialty</th><th className="p-3">Login</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {pagination.pageItems.map((item) => {
              const account = users.find((candidate) => candidate.role === "doctor" && String(candidate.emp_id?._id || candidate.emp_id) === String(item._id));
              return <tr className="border-t border-slate-100" key={item._id}>
                <td className="p-3 font-medium text-slate-800">{item.name}</td>
                <td className="p-3 text-slate-600">{item.specialization || item.department || "—"}</td>
                <td className="p-3 text-slate-600">{account?.email || "Not set up"}</td>
                <td className="p-3">{account
                  ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
                  : <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => { setDoctor(item); setEmail(item.email || ""); setError(""); }}><KeyRound size={14} /> Create login</button>}
                </td>
              </tr>;
            })}
            {!filteredDoctors.length && <tr><td colSpan="4" className="p-5 text-center text-slate-500">No doctor profiles match those filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...pagination} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize}/></div>

      {doctor && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl" onSubmit={provisionLogin}>
          <h3 className="text-lg font-semibold text-slate-900">Create login for {doctor.name}</h3>
          <label className="block text-sm font-medium text-slate-700">Work email<input className="mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="block text-sm font-medium text-slate-700">Temporary password (8+ characters)<input className="mt-1 w-full" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setDoctor(null)}>Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Create account</button>
          </div>
        </form>
      </div>}

      {credentials && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-emerald-800">Doctor login created</h3>
          <p className="text-sm text-slate-600">Share these credentials with {credentials.name}:</p>
          <div className="rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-800"><div>Email: {credentials.email}</div><div>Password: {credentials.password}</div></div>
          <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setCredentials(null)}>Done</button>
        </div>
      </div>}
    </section>
  );
}
