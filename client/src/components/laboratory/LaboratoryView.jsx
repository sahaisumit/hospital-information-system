import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Plus, Printer, CheckCircle, AlertTriangle, FileCheck, Layers, LockKeyhole } from "lucide-react";
import { api } from "../../lib/api";
import PrintModal from "../common/PrintModal";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function LaboratoryView() {
  const [labTests, setLabTests] = useState([]);
  const [testTypes, setTestTypes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // Order Form
  const [orderPatient, setOrderPatient] = useState("");
  const [orderAppointment, setOrderAppointment] = useState("");
  const [orderTestType, setOrderTestType] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Result Form
  const [testResult, setTestResult] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [testSearch, setTestSearch] = useState("");
  const [testStatusFilter, setTestStatusFilter] = useState("");

  // Report Print State
  const [reportDoc, setReportDoc] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const isDoctor = user.role === "doctor";
  const isLabTech = user.role === "lab";
  const isPatient = user.role === "patient";
  const visibleTests = labTests.filter((t) => (!testStatusFilter || t.status === testStatusFilter) && (!testSearch.trim() || [t.test_id, t.testName, t.patient_id?.name, t.doctor_emp_id?.name].some((value) => String(value || "").toLowerCase().includes(testSearch.trim().toLowerCase()))));
  const testPagination = useListPagination(visibleTests);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsData, typesData, apptData] = await Promise.all([
        api("/lab-ops/tests"),
        isPatient ? Promise.resolve([]) : api("/lab-ops/test-types"),
        isDoctor ? api("/appointment-ops") : Promise.resolve([]),
      ]);
      setLabTests(testsData);
      setTestTypes(typesData);
      const eligibleAppointments = apptData.filter((a) => a.payment_status === "paid" && ["scheduled", "completed"].includes(a.status));
      setAppointments(eligibleAppointments);
      if (eligibleAppointments.length > 0) {
        setOrderAppointment(eligibleAppointments[0]._id);
        setOrderPatient(eligibleAppointments[0].patient_id?._id || eligibleAppointments[0].patient?._id || eligibleAppointments[0].patient_id || "");
      }
      if (typesData.length > 0) setOrderTestType(typesData[0]._id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderTest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const selectedType = testTypes.find((t) => t._id === orderTestType);
      const payload = {
        patient_id: orderPatient,
        doctor_emp_id: user.emp_id,
        appointment_id: orderAppointment,
        test_type_id: orderTestType,
        testName: selectedType?.test_name || "Diagnostic Test",
        notes: orderNotes,
      };

      const result = await api("/lab-ops/tests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(`Lab Test order ${result.test_id} created! Test fee ₹${result.charge_amount} auto-added to active bill`);
      setShowOrderModal(false);
      setOrderNotes("");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!selectedTest) return;
    setError("");
    setSuccess("");

    try {
      const uploadedReport = reportFile
        ? await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: reportFile.name, dataUrl: reader.result });
            reader.onerror = () => reject(new Error("Could not read the selected report file"));
            reader.readAsDataURL(reportFile);
          })
        : null;
      const payload = {
        result: testResult,
        notes: resultNotes,
        ...(uploadedReport ? { reportFile: uploadedReport } : {}),
      };

      const res = await api(`/lab-ops/tests/${selectedTest._id}/result`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSuccess(res.message);
      setShowResultModal(false);
      setTestResult("");
      setResultNotes("");
      setReportFile(null);
      loadData();

      // Automatically view printable report
      handlePrintReport(selectedTest._id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintReport = async (testId) => {
    try {
      const report = await api(`/lab-ops/tests/${testId}/report`);
      setReportDoc(report);
      setShowPrint(true);
    } catch (err) {
      setError("Failed to fetch lab report: " + err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>{isPatient ? "My Laboratory Reports" : "Laboratory Management & Diagnostic Reports"}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {isPatient
              ? "View your completed laboratory reports after the test charge has been paid."
              : "Test catalog, doctor requisitions, technician report uploads, and automatic billing."}
          </p>
        </div>
        {isDoctor && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowOrderModal(true)}>
          <Plus size={16} /> Requisition Lab Test
        </button>}
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* TEST TYPES CATALOG PREVIEW */}
      {!isPatient && <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3>Standard Diagnostic Test Catalog & Pricing</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {testTypes.map((tt) => (
            <div key={tt._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <strong>{tt.test_name}</strong>
              <div className="my-1 text-xs text-slate-600">{tt.category || "Pathology"} • Ref: {tt.normal_range}</div>
              <div className="text-base font-extrabold text-blue-700">₹{tt.price}</div>
            </div>
          ))}
        </div>
      </div>}

      {/* LAB TESTS TABLE */}
      <div className="mt-5 flex flex-wrap gap-2"><input className="min-w-[220px] flex-1" placeholder="Search test, patient, doctor..." value={testSearch} onChange={(e) => setTestSearch(e.target.value)}/><select className="w-auto" value={testStatusFilter} onChange={(e) => setTestStatusFilter(e.target.value)}><option value="">All statuses</option>{["ordered", "processing", "completed", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select></div>
      <div className="mt-6 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              {!isPatient && <th>Patient</th>}
              <th>Test Name</th>
              {!isPatient && <th>Ordering Doctor</th>}
              <th>Date</th>
              <th>Status</th>
              {isPatient && <th>Charge</th>}
              <th>{isPatient ? "Payment / Report" : "Result Summary"}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testPagination.pageItems.map((t) => (
              <tr key={t._id}>
                <td><strong>{t.test_id || t._id.slice(-6)}</strong></td>
                {!isPatient && <td>{t.patient_id?.name || t.patient?.name || "Patient"}</td>}
                <td><strong>{t.testName}</strong></td>
                {!isPatient && <td>{t.doctor_emp_id?.name || t.doctor?.name || "Doctor"}</td>}
                <td>{new Date(t.test_date || t.orderedAt).toLocaleDateString()}</td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${t.status === "completed" ? "bg-emerald-50 text-emerald-700" : t.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                    {t.status?.toUpperCase()}
                  </span>
                </td>
                {isPatient && <td>₹{Number(t.charge_amount || 0).toLocaleString()}</td>}
                <td>
                  {(["doctor", "patient"].includes(user.role) && t.status === "completed" && !t.report_paid)
                    ? <span className="inline-flex items-center gap-1 text-amber-700"><LockKeyhole size={14} /> Locked until payment</span>
                    : t.result || t.report_file_name || <em className="text-slate-500">Awaiting Lab Findings</em>}
                </td>
                <td>
                  <div className="flex gap-1.5">
                    {t.status !== "completed" && isLabTech ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={() => {
                          setSelectedTest(t);
                          setTestResult("");
                          setResultNotes("");
                          setReportFile(null);
                          setShowResultModal(true);
                        }}
                      >
                        <FileCheck size={13} /> Enter Result
                      </button>
                    ) : t.status === "completed" && (!(["doctor", "patient"].includes(user.role)) || t.report_paid) ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        onClick={() => handlePrintReport(t._id)}
                      >
                        <Printer size={13} /> View Report
                      </button>
                    ) : t.status === "completed" && isPatient && !t.report_paid ? (
                      <Link to="/bills" className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">Pay in Billing</Link>
                    ) : t.status === "completed" && isDoctor && !t.report_paid ? (
                      <span className="text-xs text-slate-500">Awaiting patient payment</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {labTests.length === 0 && (
              <tr>
                <td colSpan={isPatient ? 7 : 8} className="px-5 py-14 text-center text-sm text-slate-500">No diagnostic tests ordered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...testPagination} onPageChange={testPagination.setPage} onPageSizeChange={testPagination.setPageSize}/></div>

      {/* ORDER TEST MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleOrderTest}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Requisition Lab Test</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowOrderModal(false)}>×</button>
            </div>

            <label>
              Paid appointment
              <select
                value={orderAppointment}
                onChange={(e) => {
                  const appt = appointments.find((a) => a._id === e.target.value);
                  setOrderAppointment(e.target.value);
                  setOrderPatient(appt?.patient_id?._id || appt?.patient?._id || appt?.patient_id || "");
                }}
                required
              >
                {appointments.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.patient_id?.name || a.patient?.name || "Patient"} — {a.appointment_id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Diagnostic Test Type (Test_type)
              <select
                value={orderTestType}
                onChange={(e) => setOrderTestType(e.target.value)}
                required
              >
                {testTypes.map((tt) => (
                  <option key={tt._id} value={tt._id}>
                    {tt.test_name} (₹{tt.price}) — {tt.category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Clinical Indication / Reason for Order
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Rule out anemia, routine lipid monitoring, pre-operative screening"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowOrderModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Order Test & Auto-Bill</button>
            </div>
          </form>
        </div>
      )}

      {/* ENTER RESULTS MODAL */}
      {showResultModal && selectedTest && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleSubmitResult}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Submit Laboratory Findings </h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => { setShowResultModal(false); setReportFile(null); }}>×</button>
            </div>

            <div className="my-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p><strong>Patient:</strong> {selectedTest.patient_id?.name || selectedTest.patient?.name}</p>
              <p><strong>Test:</strong> {selectedTest.testName}</p>
              <p><strong>Standard Reference Range:</strong> {selectedTest.normal_range || "Standard biological limits"}</p>
            </div>

            <label>
              Reporting technician
              <input value={user.name || "Laboratory staff"} readOnly />
            </label>

            <label>
              Observed Analytical Result <span className="text-xs text-slate-500">(optional if you upload a report)</span>
              <input
                value={testResult}
                onChange={(e) => setTestResult(e.target.value)}
                placeholder="e.g. Hb: 13.8 g/dL, Total WBC: 7,200 /mcL, Platelets: 2.4 Lakhs"
              />
            </label>

            <label>
              Upload report image or PDF <span className="text-xs text-slate-500">(PNG, JPG, WEBP, or PDF · max 8 MB)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(event) => setReportFile(event.target.files?.[0] || null)}
              />
              {reportFile && <small className="text-slate-500">Selected: {reportFile.name}</small>}
            </label>

            <label>
              Pathologist / Technician Remarks
              <textarea
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                placeholder="Observations, morphology notes, recommendations..."
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => { setShowResultModal(false); setReportFile(null); }}>Cancel</button>
              <button type="submit" disabled={!testResult.trim() && !reportFile} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Submit Report</button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT LAB REPORT MODAL */}
      <PrintModal
        show={showPrint}
        onClose={() => setShowPrint(false)}
        title="Diagnostic Pathology Report"
        data={reportDoc}
        type="lab"
      />
    </div>
  );
}
