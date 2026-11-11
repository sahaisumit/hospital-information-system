import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BedDouble, CheckCircle, AlertTriangle, UserCheck, Plus, LogOut, Printer, ShieldAlert, Send, Search } from "lucide-react";
import { api } from "../../lib/api";
import PrintModal from "../common/PrintModal";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function AdmissionView() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const isDoctor = user.role === "doctor";
  const isAdmin = user.role === "admin";
  const isNurse = user.role === "nurse";
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  // Admit Form
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  // Discharge Form
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatus, setRoomStatus] = useState("");
  const [forwardPatientId, setForwardPatientId] = useState("");
  const [forwardDoctorId, setForwardDoctorId] = useState("");
  const [forwardReason, setForwardReason] = useState("");
  const [showForwardModal, setShowForwardModal] = useState(false);

  // Print Summary State
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (location.state?.patientId) {
      setSelectedPatient(location.state.patientId);
      setShowAdmitModal(true);
    }
  }, [location.state]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, admData, patsData, docsData] = await Promise.all([
        api("/admission-ops/rooms"),
        api("/admission-ops"),
        api("/patients"),
        api("/doctors"),
      ]);
      setRooms(roomsData);
      setAdmissions(admData);
      setPatients(patsData);
      setDoctors(docsData);

      // Default room selection to first available room
      const firstAvail = roomsData.find((r) => r.status === "available");
      if (firstAvail) setSelectedRoom(firstAvail._id);
      if (patsData.length > 0) setSelectedPatient(patsData[0]._id);
      if (isDoctor && user.emp_id) setSelectedDoctor(user.emp_id);
      else if (docsData.length > 0) setSelectedDoctor(docsData[0]._id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const visibleAdmissions = admissions.filter((adm) => {
    const query = admissionSearch.trim().toLowerCase();
    const matchesStatus = admissionStatus === "all" || adm.status === admissionStatus;
    const matchesSearch = !query || [adm.admission_id, adm.patient_id?.name, adm.doctor_emp_id?.name, adm.room_id?.room_number, adm.assigned_nurse?.name].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const admissionPagination = useListPagination(visibleAdmissions);
  const visibleRooms = rooms.filter((room) => (!roomStatus || room.status === roomStatus) && (!roomSearch.trim() || [room.room_number, room.room_type, room.patient?.name].some((value) => String(value || "").toLowerCase().includes(roomSearch.trim().toLowerCase()))));
  const roomPagination = useListPagination(visibleRooms);

  const handleForward = async (e) => {
    e.preventDefault();
    try {
      const referral = await api("/admission-ops/forward", { method: "POST", body: JSON.stringify({ patient_id: forwardPatientId, doctor_emp_id: forwardDoctorId, reason: forwardReason }) });
      setSuccess(`Referral ${referral.appointment_id} sent to Dr. ${referral.doctor_emp_id?.name}. It is now in their appointment list.`);
      setShowForwardModal(false); setForwardReason(""); loadData();
    } catch (err) { setError(err.message); }
  };

  const handleAdmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        patient_id: selectedPatient,
        room_id: selectedRoom,
        doctor_emp_id: selectedDoctor,
        diagnosis: diagnosis || "Inpatient Care & Monitoring",
      };

      const result = await api("/admission-ops/admit", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(`Patient admitted to Room ${result.room_id?.room_number}! Nurse ${result.assigned_nurse?.name || result.nurse_name || "Assigned"} assigned via automated workload balancing.`);
      setShowAdmitModal(false);
      setDiagnosis("");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setError("");
    setSuccess("");

    try {
      const result = await api(`/admission-ops/${selectedAdmission._id}/discharge`, {
        method: "POST",
        body: JSON.stringify({ notes: dischargeNotes, discharge_date: new Date() }),
      });

      setSuccess("Patient discharged successfully! Room freed and stay charges calculated and added to the master bill.");
      setShowDischargeModal(false);
      setDischargeNotes("");
      loadData();

      // View discharge summary
      handlePrintSummary(selectedAdmission._id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintSummary = async (admissionId) => {
    try {
      const summary = await api(`/admission-ops/${admissionId}/discharge-summary`);
      setSummaryDoc(summary);
      setShowPrint(true);
    } catch (err) {
      setError("Failed to fetch discharge summary: " + err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>Bed & Ward Management / Inpatient Care </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Real-time room occupancy, doctor admission authorization, automated nurse workload balancing , and stay billing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDoctor && <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-700" onClick={() => setShowForwardModal(true)}><Send size={16} /> Forward to doctor</button>}
          {!isNurse && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowAdmitModal(true)}><Plus size={16} /> Admit Patient (IPD)</button>}
        </div>
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* ROOM & BED VISUAL BOARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3>Room & Bed Availability Board (Live Status)</h3>
        <div className="mb-3 flex flex-wrap gap-2"><input className="min-w-[200px] flex-1" placeholder="Search room, ward, patient..." value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)}/><select className="w-auto" value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)}><option value="">All room statuses</option><option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option></select></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roomPagination.pageItems.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition">
              <div className="mb-2 flex items-center justify-between">
                <strong>{r.room_number || r.bedNumber}</strong>
                <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${r.status === "occupied" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{r.status?.toUpperCase()}</span>
              </div>
              <div className="text-sm font-semibold text-slate-800">{r.room_type || r.ward}</div>
              <div className="mt-1 text-xs text-slate-600">₹{r.daily_rate || 500} / day</div>
              {r.patient && (
                <div className="mt-2 border-t border-red-200 pt-2 text-xs font-semibold text-red-700">
                  Occupant: {r.patient?.name || "Admitted Patient"}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"><Pagination {...roomPagination} onPageChange={roomPagination.setPage} onPageSizeChange={roomPagination.setPageSize}/></div>
      </div>

      {/* INPATIENT ADMISSIONS TABLE */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <h3>Active & Recent Inpatient Admissions</h3>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3"><Search size={16}/><input className="w-full border-0 bg-transparent" placeholder="Search patient, doctor, room..." value={admissionSearch} onChange={(e) => setAdmissionSearch(e.target.value)}/></label>
        <select className="w-auto" value={admissionStatus} onChange={(e) => setAdmissionStatus(e.target.value)}><option value="all">All statuses</option><option value="admitted">Admitted</option><option value="discharged">Discharged</option></select>
      </div>
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Admission ID</th>
              <th>Patient</th>
              <th>Room Allocated</th>
              <th>Attending Doctor</th>
              <th>Assigned Nurse (Balanced)</th>
              <th>Admission Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admissionPagination.pageItems.map((adm) => (
              <tr key={adm._id}>
                <td><strong>{adm.admission_id}</strong></td>
                <td>{adm.patient_id?.name || adm.patient?.name || "Patient"}</td>
                <td>
                  <span className="inline-flex rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {adm.room_id?.room_number || "Ward"} ({adm.room_id?.room_type || "General"})
                  </span>
                </td>
                <td>{adm.doctor_emp_id?.name || adm.doctor?.name || "Attending Doctor"}</td>
                <td>
                  <span className="inline-flex rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                    <UserCheck size={14} /> {adm.assigned_nurse?.name || adm.nurse_name || "Floor Nurse"}
                  </span>
                </td>
                <td>{new Date(adm.admission_date).toLocaleString()}</td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${adm.status === "discharged" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {adm.status?.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1.5">
                    {!isNurse && adm.status === "admitted" && (isAdmin || (isDoctor && String(adm.doctor_emp_id?._id || adm.doctor_emp_id) === String(user.emp_id))) && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        onClick={() => {
                          setSelectedAdmission(adm);
                          setShowDischargeModal(true);
                        }}
                      >
                        <LogOut size={13} /> Discharge
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      onClick={() => handlePrintSummary(adm._id)}
                    >
                      <Printer size={13} /> Summary
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleAdmissions.length === 0 && (
              <tr>
                <td colSpan="8" className="px-5 py-14 text-center text-sm text-slate-500">No inpatient admissions recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...admissionPagination} onPageChange={admissionPagination.setPage} onPageSizeChange={admissionPagination.setPageSize}/></div>

      {/* ADMIT PATIENT MODAL */}
      {showAdmitModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleAdmit}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Doctor Admission Order</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowAdmitModal(false)}>×</button>
            </div>

            <label>
              Select Patient
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.patient_id || p.patientId}) - Current State: {p.status || "OPD"}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Select Room / Bed (Must be 'Available')
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                required
              >
                {rooms.map((r) => (
                  <option key={r._id} value={r._id} disabled={r.status !== "available"}>
                    {r.room_number || r.bedNumber} - {r.room_type || r.ward} (₹{r.daily_rate}/day) [{r.status?.toUpperCase()}]
                  </option>
                ))}
              </select>
            </label>

            {!isDoctor && <label>
              Attending Doctor
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.specialization || d.department})
                  </option>
                ))}
              </select>
            </label>}
            {isDoctor && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><strong>Attending doctor:</strong> {user.name}. Admissions created by you are assigned to you.</div>}

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
              <UserCheck size={16} />
              <span>
                <strong>Automatic nurse assignment:</strong> When you admit the patient, the system assigns an active nurse who currently has the fewest active inpatients. The nurse assignment is saved to the admission.
              </span>
            </div>

            <label>
              Clinical Admission Diagnosis / Reasons
              <textarea
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute chest pain under observation, post-operative surgical monitoring, respiratory distress"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowAdmitModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Admit & Allocate Room</button>
            </div>
          </form>
        </div>
      )}

      {showForwardModal && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><form className="grid w-full max-w-lg gap-4 rounded-2xl bg-white p-6 shadow-2xl" onSubmit={handleForward}><div className="flex items-center justify-between"><h2>Forward patient to another doctor</h2><button type="button" onClick={() => setShowForwardModal(false)}>×</button></div><label>Patient<select required value={forwardPatientId} onChange={(e) => setForwardPatientId(e.target.value)}><option value="">Select patient</option>{patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.patient_id || p.patientId})</option>)}</select></label><label>Receiving doctor<select required value={forwardDoctorId} onChange={(e) => setForwardDoctorId(e.target.value)}><option value="">Select doctor</option>{doctors.filter((d) => String(d._id) !== String(user.emp_id)).map((d) => <option key={d._id} value={d._id}>{d.name} — {d.department || "General"} / {d.specialization || "General Medicine"}</option>)}</select></label><label>Referral reason<textarea value={forwardReason} onChange={(e) => setForwardReason(e.target.value)} placeholder="Reason for clinical review / admission assessment"/></label><p className="text-sm text-slate-600">A referral appointment will appear in the receiving doctor’s appointment list. They can open it and start the admission.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForwardModal(false)}>Cancel</button><button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" type="submit">Send referral</button></div></form></div>}

      {/* DISCHARGE PATIENT MODAL */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleDischarge}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Discharge Process Initiation </h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowDischargeModal(false)}>×</button>
            </div>

            <div className="my-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p><strong>Patient:</strong> {selectedAdmission.patient_id?.name || "Patient"}</p>
              <p><strong>Allocated Room:</strong> {selectedAdmission.room_id?.room_number} ({selectedAdmission.room_id?.room_type})</p>
              <p><strong>Admitted Date:</strong> {new Date(selectedAdmission.admission_date).toLocaleString()}</p>
              <p><strong>Automatic Action:</strong> Room will be freed, nurse assignment deactivated, and length-of-stay charges will be auto-calculated into patient's master invoice.</p>
            </div>

            <label>
              Discharge Instructions & Medical Protocol
              <textarea
                required
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Discharge summary, home medications, follow-up schedule..."
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowDischargeModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Confirm Discharge & Bill Stay</button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT DISCHARGE SUMMARY MODAL */}
      <PrintModal
        show={showPrint}
        onClose={() => setShowPrint(false)}
        title="Inpatient Discharge Summary"
        data={summaryDoc}
        type="discharge"
      />
    </div>
  );
}
