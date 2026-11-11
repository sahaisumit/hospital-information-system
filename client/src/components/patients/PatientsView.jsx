import React, { useState, useEffect } from "react";
import { Users, FileText, Plus, Search, Activity, Heart, AlertCircle, History } from "lucide-react";
import { api } from "../../lib/api";
import PrintModal from "../common/PrintModal";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function PatientsView() {
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const canRegisterPatient = ["admin", "receptionist"].includes(user.role);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);

  // New Patient Form
  const [formData, setFormData] = useState({
    name: "",
    gender: "M",
    dob: "",
    phone: "",
    email: "",
    address: "",
    blood_group: "B+",
    allergies: "None",
    history: "Routine health screening",
    status: "OPD",
  });

  // New Medical History Note Form
  const [conditionMd, setConditionMd] = useState("");
  const [notes, setNotes] = useState("");

  // Report Modal
  const [reportDoc, setReportDoc] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await api("/patient-ops");
      setPatients(data);
      setFilteredPatients(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = patients;
    if (activeTab !== "ALL") {
      result = result.filter((p) => (p.status || "OPD") === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.patient_id || p.patientId || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q)
      );
    }
    setFilteredPatients(result);
  }, [activeTab, searchQuery, patients]);
  const patientPagination = useListPagination(filteredPatients);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const result = await api("/patient-ops", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSuccess(`Patient ${result.name} successfully registered with ID ${result.patient_id}!`);
      setShowAddModal(false);
      setFormData({
        name: "",
        gender: "M",
        dob: "",
        phone: "",
        email: "",
        address: "",
        blood_group: "B+",
        allergies: "None",
        history: "Routine health screening",
        status: "OPD",
      });
      loadPatients();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenHistory = async (patient) => {
    setSelectedPatient(patient);
    try {
      const details = await api(`/patient-ops/${patient._id}`);
      setPatientDetails(details);
      setShowHistoryModal(true);
    } catch (err) {
      setError("Failed to load patient history: " + err.message);
    }
  };

  const handleAddHistoryNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !conditionMd.trim()) return;
    try {
      await api(`/patient-ops/${selectedPatient._id}/medical-history`, {
        method: "POST",
        body: JSON.stringify({ condition_md: conditionMd, notes }),
      });
      setConditionMd("");
      setNotes("");
      const details = await api(`/patient-ops/${selectedPatient._id}`);
      setPatientDetails(details);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateReport = async (patientId) => {
    try {
      const report = await api(`/patient-ops/${patientId}/report`);
      setReportDoc(report);
      setShowReport(true);
    } catch (err) {
      setError("Failed to generate clinical report: " + err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>Patient Administration & EMR Records</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Unique digital health identifier, Outpatient (OPD) & Inpatient (IPD) lifecycle tracking, and longitudinal medical history.
          </p>
        </div>
        {canRegisterPatient && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Register New Patient
        </button>}
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* TABS FOR OPD vs IPD  */}
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "ALL" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("ALL")}>
          All Patients ({patients.length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "OPD" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("OPD")}>
          OPD - Outpatients ({patients.filter((p) => (p.status || "OPD") === "OPD").length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "IPD" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("IPD")}>
          IPD - Admitted Inpatients ({patients.filter((p) => p.status === "IPD").length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "Discharged" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("Discharged")}>
          Discharged ({patients.filter((p) => p.status === "Discharged").length})
        </button>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="mb-4 flex justify-end">
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <Search size={16} />
          <input className="w-full border-0 p-0 focus:border-0 focus:ring-0"
            placeholder="Search by patient name, unique ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Full Name</th>
              <th>Gender / DOB</th>
              <th>Blood Group</th>
              <th>Contact Phone</th>
              <th>Department / Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patientPagination.pageItems.map((p) => (
              <tr key={p._id}>
                <td><strong>{p.patient_id || p.patientId || p._id.slice(-6)}</strong></td>
                <td>{p.name}</td>
                <td>{p.gender || "M"} • {p.dob ? new Date(p.dob).toLocaleDateString() : "N/A"}</td>
                <td><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{p.blood_group || p.bloodGroup || "O+"}</span></td>
                <td>{p.phone || "—"}</td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${p.status === "IPD" ? "bg-red-50 text-red-700" : p.status === "Discharged" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                    {p.status || "OPD"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      title="View EMR & Medical History"
                      onClick={() => handleOpenHistory(p)}
                    >
                      <History size={14} /> EMR History
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      title="Generate Full Patient Clinical Report"
                      onClick={() => handleGenerateReport(p._id)}
                    >
                      <FileText size={14} /> Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="7" className="px-5 py-14 text-center text-sm text-slate-500">No matching patient records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...patientPagination} onPageChange={patientPagination.setPage} onPageSizeChange={patientPagination.setPageSize}/></div>

      {/* REGISTER NEW PATIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleRegisterPatient}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Register New Patient</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Full Name
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                />
              </label>

              <label>
                Gender
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                />
              </label>

              <label>
                Blood Group
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </label>

              <label>
                Contact Phone
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="patient@example.com"
                />
              </label>
            </div>

            <label>
              Residential Address
              <input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, City, Pin Code"
              />
            </label>

            <label>
              Known Allergies
              <input
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
              />
            </label>

            <label>
              Initial Medical History Notes (Medical_history)
              <textarea
                value={formData.history}
                onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                placeholder="Past diagnoses, surgeries, chronic medications..."
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Register & Create Digital ID</button>
            </div>
          </form>
        </div>
      )}

      {/* LONGITUDINAL MEDICAL HISTORY MODAL */}
      {showHistoryModal && selectedPatient && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-w-4xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <div>
                <h2>Electronic Medical Record (EMR) — {selectedPatient.name}</h2>
                <small>Unique ID: {selectedPatient.patient_id || selectedPatient.patientId} | Status: {selectedPatient.status || "OPD"}</small>
              </div>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>

            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              {/* Existing History Timeline */}
              <div className="space-y-4">
                <h3>Longitudinal Diagnoses & Clinical Timeline (Medical_history)</h3>
                <div className="space-y-3">
                  {patientDetails?.history?.map((h) => (
                    <div key={h._id} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="shrink-0 text-xs font-semibold text-slate-500">{new Date(h.diagnosis_date).toLocaleDateString()}</div>
                      <div className="min-w-0">
                        <strong>{h.condition_md}</strong>
                        <p>{h.notes}</p>
                      </div>
                    </div>
                  ))}
                  {(!patientDetails?.history || patientDetails.history.length === 0) && (
                    <p className="px-5 py-14 text-center text-sm text-slate-500">No chronic diagnoses logged yet.</p>
                  )}
                </div>

                {/* Add Diagnosis Entry Form */}
                <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleAddHistoryNote}>
                  <h4>Log New Clinical Finding / Diagnosis</h4>
                  <input
                    required
                    value={conditionMd}
                    onChange={(e) => setConditionMd(e.target.value)}
                    placeholder="Clinical condition / diagnosis (e.g. Stage 1 Hypertension)"
                  />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Doctor observations, clinical plan, prescribed treatment..."
                  />
                  <button type="submit" className="inline-flex self-start items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    + Record Diagnosis to EMR
                  </button>
                </form>
              </div>

              {/* Quick Summary of Encounters */}
              <div className="mt-6 space-y-3">
                <h4>Clinical Encounters Summary</h4>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4">
                  <div><strong>Appointments:</strong> {patientDetails?.appointments?.length || 0}</div>
                  <div><strong>Prescriptions:</strong> {patientDetails?.prescriptions?.length || 0}</div>
                  <div><strong>Admissions (IPD):</strong> {patientDetails?.admissions?.length || 0}</div>
                  <div><strong>Invoices:</strong> {patientDetails?.bills?.length || 0}</div>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleGenerateReport(selectedPatient._id)}
                >
                  <FileText size={16} /> Print Full Case Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PATIENT REPORT MODAL */}
      <PrintModal
        show={showReport}
        onClose={() => setShowReport(false)}
        title="Comprehensive Patient Case Report"
        data={reportDoc}
        type="patientReport"
      />
    </div>
  );
}
