import React, { useState, useEffect } from "react";
import { UserCheck, Briefcase, Plus, Building, ShieldCheck, HeartPulse, CheckCircle } from "lucide-react";
import { api } from "../../lib/api";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function StaffView() {
  const [employees, setEmployees] = useState([]);
  const [nursesWorkload, setNursesWorkload] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    try { return JSON.parse(localStorage.getItem("his_user") || "{}").role === "nurse" ? "nurses" : "employees"; }
    catch { return "employees"; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [listSearch, setListSearch] = useState("");

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const isNurse = user.role === "nurse";
  const visibleEmployees = employees.filter((emp) => !listSearch.trim() || [emp.emp_id, emp.name, emp.role_name, emp.department_name].some((v) => String(v || "").toLowerCase().includes(listSearch.trim().toLowerCase())));
  const visibleNurses = nursesWorkload.filter((row) => !listSearch.trim() || [row.nurse?.name, row.nurse?.department, row.workloadStatus].some((v) => String(v || "").toLowerCase().includes(listSearch.trim().toLowerCase())));
  const visibleDepartments = departments.filter((row) => !listSearch.trim() || [row.dept_name, row.department_id, row.description].some((v) => String(v || "").toLowerCase().includes(listSearch.trim().toLowerCase())));
  const employeePagination = useListPagination(visibleEmployees);
  const nursePagination = useListPagination(visibleNurses);
  const departmentPagination = useListPagination(visibleDepartments);

  // New Employee Form
  const [empForm, setEmpForm] = useState({
    name: "",
    gender: "M",
    role_name: "Doctor",
    department_name: "Cardiology",
    salary: 100000,
    hire_date: new Date().toISOString().split("T")[0],
    email: "",
    phone: "",
    specialization: "Cardiologist",
    license_no: "",
    consultation_fee: 600,
    login_password: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, nursesData, deptsData, hospsData] = await Promise.all([
        isNurse ? Promise.resolve([]) : api("/staff-ops/employees"),
        api("/staff-ops/nurses-workload"),
        isNurse ? Promise.resolve([]) : api("/staff-ops/departments"),
        isNurse ? Promise.resolve([]) : api("/staff-ops/hospitals"),
      ]);
      setEmployees(empData);
      setNursesWorkload(nursesData);
      setDepartments(deptsData);
      setHospitals(hospsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await api("/staff-ops/employees", {
        method: "POST",
        body: JSON.stringify(empForm),
      });

      setSuccess(`Employee ${res.employee.name} onboarded. Login credentials — ${res.loginCredentials.email} / ${res.loginCredentials.password} (${res.loginCredentials.role}). Share these credentials with the staff member.`);
      setShowAddEmpModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>{isNurse ? "My Nursing Workload" : "Staff & Resource Allocation"}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {isNurse ? "Review the active inpatient assignments linked to your account." : "Manage staff accounts and review nursing workload across the hospital."}
          </p>
        </div>
        {!isNurse && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowAddEmpModal(true)}>
          <Plus size={16} /> Onboard Staff Member
        </button>}
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* TABS */}
      {!isNurse && <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "employees" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("employees")}>
          Employee Directory ({employees.length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "nurses" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("nurses")}>
          Nurse Workload Balancer ({nursesWorkload.length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "departments" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("departments")}>
          Departments & Facility ({departments.length})
        </button>
      </div>}

      {/* 1. EMPLOYEE DIRECTORY */}
      {(isNurse || activeTab === "employees" || activeTab === "nurses" || activeTab === "departments") && <div className="mb-3"><input className="w-full max-w-md" placeholder="Filter staff, nurse, or department..." value={listSearch} onChange={(e) => setListSearch(e.target.value)}/></div>}
      {!isNurse && activeTab === "employees" && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Employee Name</th>
                <th>Designation / Role</th>
                <th>Department</th>
                <th>Base Salary</th>
                <th>Hire Date</th>
                <th>Employment Status</th>
              </tr>
            </thead>
            <tbody>
              {employeePagination.pageItems.map((emp) => (
                <tr key={emp._id}>
                  <td><strong>{emp.emp_id}</strong></td>
                  <td><strong>{emp.name}</strong></td>
                  <td>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {emp.role_name}
                    </span>
                  </td>
                  <td>{emp.department_name || "General"}</td>
                  <td>₹{(emp.salary || 0).toLocaleString()}</td>
                  <td>{new Date(emp.hire_date || emp.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700">{emp.employment_status?.toUpperCase() || "ACTIVE"}</span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-14 text-center text-sm text-slate-500">No employee records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!isNurse && activeTab === "employees" && <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...employeePagination} onPageChange={employeePagination.setPage} onPageSizeChange={employeePagination.setPageSize}/></div>}

      {/* 2. NURSE WORKLOAD BALANCER */}
      {activeTab === "nurses" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {nursePagination.pageItems.map((nw) => (
            <div key={nw.nurse?._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <HeartPulse size={24} color="#1769e0" />
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${nw.workloadStatus === "Available" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  {nw.workloadStatus}
                </span>
              </div>
              <h3>{nw.nurse?.name}</h3>
              <p className="mb-3 text-xs text-slate-600">Dept: {nw.nurse?.department || "Emergency & General Care"}</p>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                <span>Active Patient Assignments:</span>
                <strong>{nw.activeAssignments} Inpatients</strong>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "nurses" && <div className="mt-2 overflow-hidden rounded-b-2xl border border-slate-200 bg-white"><Pagination {...nursePagination} onPageChange={nursePagination.setPage} onPageSizeChange={nursePagination.setPageSize}/></div>}

      {/* 3. DEPARTMENTS & FACILITY */}
      {!isNurse && activeTab === "departments" && (
        <div>
          {hospitals.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3><Building size={20} /> Primary Medical Facility (Hospital Entity)</h3>
              <p><strong>{hospitals[0]?.h_name}</strong></p>
              <p>{hospitals[0]?.address}</p>
              <p>Contact: {hospitals[0]?.phone} | Email: {hospitals[0]?.email}</p>
            </div>
          )}

          <h3 className="mt-5">Hospital Departments</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departmentPagination.pageItems.map((d) => (
              <div key={d._id} className="rounded-xl border border-slate-200 bg-white p-4">
                <strong>{d.dept_name}</strong>
                <p>{d.description || "Clinical specialty division"}</p>
                <small>Code: {d.department_id}</small>
              </div>
            ))}
          </div>
          <div className="mt-2 overflow-hidden rounded-b-2xl border border-slate-200 bg-white"><Pagination {...departmentPagination} onPageChange={departmentPagination.setPage} onPageSizeChange={departmentPagination.setPageSize}/></div>
        </div>
      )}

      {/* ONBOARD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleCreateEmployee}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Onboard Employee</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowAddEmpModal(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Full Name
                <input
                  required
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  placeholder="e.g. Dr. Siddharth Sen"
                />
              </label>

              <label>
                Gender
                <select
                  value={empForm.gender}
                  onChange={(e) => setEmpForm({ ...empForm, gender: e.target.value })}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </label>

              <label>
                Role
                <select
                  value={empForm.role_name}
                  onChange={(e) => setEmpForm({ ...empForm, role_name: e.target.value })}
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Lab Technician">Lab Technician</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Admin">Admin</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </label>

              <label>
                Work email (login)
                <input
                  type="email"
                  required
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  placeholder="doctor@hospital.org"
                />
              </label>

              <label>
                Temporary password (8+ characters)
                <input
                  type="password"
                  minLength={8}
                  required
                  value={empForm.login_password}
                  onChange={(e) => setEmpForm({ ...empForm, login_password: e.target.value })}
                />
              </label>

              <label>
                Department
                <select
                  value={empForm.department_name}
                  onChange={(e) => setEmpForm({ ...empForm, department_name: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d._id} value={d.dept_name}>{d.dept_name}</option>
                  ))}
                  {departments.length === 0 && (
                    <option value="Cardiology">Cardiology</option>
                  )}
                </select>
              </label>

              <label>
                Base Salary (₹)
                <input
                  type="number"
                  required
                  value={empForm.salary}
                  onChange={(e) => setEmpForm({ ...empForm, salary: Number(e.target.value) })}
                />
              </label>

              <label>
                Hire Date
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={empForm.hire_date}
                  onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })}
                />
              </label>

              <label>
                Contact Phone
                <input
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  placeholder="Mobile number"
                />
              </label>
            </div>

            {empForm.role_name === "Doctor" && (
              <div className="mt-2 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-2">
                <label>
                  Specialization
                  <input
                    value={empForm.specialization}
                    onChange={(e) => setEmpForm({ ...empForm, specialization: e.target.value })}
                    placeholder="e.g. Cardiologist"
                  />
                </label>
                <label>
                  License Number
                  <input
                    value={empForm.license_no}
                    onChange={(e) => setEmpForm({ ...empForm, license_no: e.target.value })}
                    placeholder="e.g. MP-MED-99120"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowAddEmpModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Onboard Employee & Distribute Role</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
