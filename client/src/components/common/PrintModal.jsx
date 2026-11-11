import React from "react";
import { Printer, X, CheckCircle, Hospital } from "lucide-react";

export default function PrintModal({ show, onClose, title, data, type }) {
  if (!show || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] w-[95%] max-w-[820px] overflow-y-auto p-0">
        {/* Modal Controls (Hidden in Print) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3 print:hidden">
          <h2>{title || "Official Document"}</h2>
          <div className="flex gap-2.5">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={handlePrint}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="bg-white p-6 text-slate-900 sm:p-10" id="printable-area">
          {/* Institution Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
                <Hospital size={36} color="#1769e0" />
              </div>
              <div>
                <h1 className="m-0 text-[15px] font-extrabold tracking-wide text-blue-950">
                  MAULANA AZAD NATIONAL INSTITUTE OF TECHNOLOGY BHOPAL
                </h1>
                <p className="my-1 text-sm font-semibold text-blue-700">
                  MANIT Health Care & Research Hospital — Information System (HIS)
                </p>
                <small className="block text-xs text-slate-500">
                  Link Road Number 3, MANIT Campus, Bhopal, Madhya Pradesh 462003 | Phone: +91-755-4051000
                </small>
              </div>
            </div>
            <div className="rounded-md bg-blue-950 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white">{data.slipNo || data.reportNo || data.receiptNo || data.admissionNo || "OFFICIAL RECORD"}</div>
          </div>

          <hr className="my-5 border-t-2 border-blue-950" />

          {/* DOCUMENT BODY ACCORDING TO TYPE */}

          {/* 1. Appointment Slip */}
          {type === "appointment" && (
            <div className="space-y-5 text-sm leading-6">
              <h3 className="mb-5 text-center text-base font-extrabold uppercase tracking-wide text-blue-950">APPOINTMENT CONFIRMATION SLIP</h3>
              <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <p><strong>Slip No:</strong> {data.slipNo}</p>
                  <p><strong>Patient Name:</strong> {data.patientName}</p>
                  <p><strong>Patient ID:</strong> {data.patientId}</p>
                </div>
                <div>
                  <p><strong>Consulting Doctor:</strong> {data.doctorName}</p>
                  <p><strong>Department:</strong> {data.department}</p>
                  <p><strong>Date & Time Slot:</strong> {new Date(data.appointmentDate).toLocaleDateString()} ({data.timeSlot})</p>
                  <p><strong>Consultation Fee:</strong> ₹{data.consultationFee}</p>
                  <p><strong>Payment:</strong> {data.paymentStatus?.toUpperCase()} · {data.paymentMethod}</p>
                  {data.paymentReference && <p><strong>Receipt / Reference:</strong> {data.paymentReference}</p>}
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Notice:</strong> {data.instructions}
              </div>
            </div>
          )}

          {/* 2. Diagnostic Lab Report */}
          {type === "lab" && (
            <div className="space-y-5 text-sm leading-6">
              <h3 className="mb-5 text-center text-base font-extrabold uppercase tracking-wide text-blue-950">DIAGNOSTIC PATHOLOGY REPORT</h3>
              <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <p><strong>Report No:</strong> {data.reportNo}</p>
                  <p><strong>Patient Name:</strong> {data.patientName} ({data.patientId})</p>
                  <p><strong>Age / Gender:</strong> {data.patientAge} yrs / {data.gender}</p>
                  <p><strong>Referring Doctor:</strong> {data.referringDoctor || "Attending Physician"}</p>
                </div>
                <div>
                  <p><strong>Test Date:</strong> {new Date(data.testDate).toLocaleDateString()}</p>
                  <p><strong>Report Status:</strong> <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{data.status?.toUpperCase()}</span></p>
                  <p><strong>Reporting Technician:</strong> {data.technician}</p>
                </div>
              </div>

              <table className="my-5 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th>Investigation / Parameter</th>
                    <th>Observed Result</th>
                    <th>Biological Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{data.testName}</strong></td>
                    <td className="font-bold text-blue-700">{data.result}</td>
                    <td>{data.normalRange}</td>
                  </tr>
                </tbody>
              </table>

              {data.notes && (
                <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-slate-700">
                  <strong>Clinical Impressions:</strong> {data.notes}
                </div>
              )}

              {data.reportFile?.dataUrl && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>Attached report: {data.reportFile.name}</strong>
                    <a className="font-semibold text-blue-700 underline print:hidden" href={data.reportFile.dataUrl} download={data.reportFile.name}>Download</a>
                  </div>
                  {data.reportFile.type === "application/pdf" ? (
                    <iframe title={data.reportFile.name} src={data.reportFile.dataUrl} className="h-[65vh] w-full rounded-lg border border-slate-200" />
                  ) : (
                    <img src={data.reportFile.dataUrl} alt={data.reportFile.name} className="mx-auto max-h-[65vh] max-w-full object-contain" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Inpatient Discharge Summary */}
          {type === "discharge" && (
            <div className="space-y-5 text-sm leading-6">
              <h3 className="mb-5 text-center text-base font-extrabold uppercase tracking-wide text-blue-950">INPATIENT DISCHARGE SUMMARY & CASE CLOSURE</h3>
              <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <p><strong>Admission No:</strong> {data.admissionNo}</p>
                  <p><strong>Patient Name:</strong> {data.patientName} ({data.patientId})</p>
                  <p><strong>Room Allocated:</strong> {data.roomAllocated} ({data.roomType})</p>
                </div>
                <div>
                  <p><strong>Admission Date:</strong> {new Date(data.admissionDate).toLocaleString()}</p>
                  <p><strong>Discharge Date:</strong> {new Date(data.dischargeDate).toLocaleString()}</p>
                  <p><strong>Attending Doctor:</strong> {data.attendingDoctor}</p>
                  <p><strong>Assigned Nurse:</strong> {data.assignedNurse}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4>Primary Diagnosis:</h4>
                <p>{data.diagnosis || "Acute medical care observation completed."}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4>Discharge Advice & Prescribed Protocol:</h4>
                <p>{data.dischargeAdvice}</p>
              </div>
            </div>
          )}

          {/* 4. Consolidated Billing Receipt */}
          {type === "bill" && (
            <div className="space-y-5 text-sm leading-6">
              <h3 className="mb-5 text-center text-base font-extrabold uppercase tracking-wide text-blue-950">OFFICIAL HEALTHCARE TAX INVOICE & RECEIPT</h3>
              <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <p><strong>Receipt No:</strong> {data.receiptNo}</p>
                  <p><strong>Invoice ID:</strong> {data.billId}</p>
                  <p><strong>Billing Date:</strong> {new Date(data.billDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Patient Name:</strong> {data.patientDetails?.name}</p>
                  <p><strong>Patient ID:</strong> {data.patientDetails?.id}</p>
                  <p><strong>Payment Status:</strong> <span className={data.paymentStatus === "paid" ? "rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" : "rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"}>{data.paymentStatus?.toUpperCase()}</span></p>
                  <p><strong>Payment Mode:</strong> {data.paymentMethod}</p>
                </div>
              </div>

              <table className="my-5 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Category</th>
                    <th className="text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itemizedCharges?.consultations?.map((c, i) => (
                    <tr key={`c-${i}`}>
                      <td>{c.desc}</td>
                      <td>Doctor Consultation</td>
                      <td className="text-right">₹{c.amount}</td>
                    </tr>
                  ))}
                  {data.itemizedCharges?.pharmacy?.map((m, i) => (
                    <tr key={`m-${i}`}>
                      <td>{m.desc}</td>
                      <td>Pharmacy Medication</td>
                      <td className="text-right">₹{m.amount}</td>
                    </tr>
                  ))}
                  {data.itemizedCharges?.laboratory?.map((l, i) => (
                    <tr key={`l-${i}`}>
                      <td>{l.desc}</td>
                      <td>Diagnostic Laboratory</td>
                      <td className="text-right">₹{l.amount}</td>
                    </tr>
                  ))}
                  {data.itemizedCharges?.inpatientStay?.map((s, i) => (
                    <tr key={`s-${i}`}>
                      <td>{s.desc}</td>
                      <td>Inpatient Room Stay</td>
                      <td className="text-right">₹{s.amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="2" className="text-right">GRAND TOTAL:</th>
                    <th className="text-right text-base text-blue-700">
                      ₹{data.totals?.grandTotal?.toLocaleString()}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 5. Patient Clinical Report */}
          {type === "patientReport" && (
            <div className="space-y-5 text-sm leading-6">
              <h3 className="mb-5 text-center text-base font-extrabold uppercase tracking-wide text-blue-950">PATIENT COMPREHENSIVE CLINICAL SUMMARY</h3>
              <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-2">
                <div>
                  <p><strong>Patient Name:</strong> {data.patient?.name}</p>
                  <p><strong>Unique Patient ID:</strong> {data.patient?.patient_id}</p>
                  <p><strong>Gender / Blood Group:</strong> {data.patient?.gender} / {data.patient?.blood_group || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Contact:</strong> {data.patient?.phone}</p>
                  <p><strong>Current Clinical State:</strong> <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{data.patient?.status || "OPD"}</span></p>
                  <p><strong>Address:</strong> {data.patient?.address}</p>
                </div>
              </div>

              <h4>Longitudinal Medical History</h4>
              <ul className="list-inside list-disc space-y-1">
                {data.clinicalData?.history?.map((h, i) => (
                  <li key={i}>
                    <strong>{new Date(h.diagnosis_date).toLocaleDateString()}:</strong> {h.condition_md} — <em>{h.notes}</em>
                  </li>
                ))}
                {(!data.clinicalData?.history || data.clinicalData?.history?.length === 0) && (
                  <li>No chronic medical conditions recorded.</li>
                )}
              </ul>
            </div>
          )}

          {/* Document authorization footer */}
          <div className="mt-10 border-t border-slate-200 pt-5">
            <div className="mb-6 flex justify-between gap-6">
              <div>
                <div className="mb-2 w-56 border-t border-slate-500"></div>
                <small>Authorized Medical Officer / Attending Staff</small>
              </div>
              <div>
                <div className="mb-2 w-56 border-t border-slate-500"></div>
                <small>System Admin / Registrar</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
