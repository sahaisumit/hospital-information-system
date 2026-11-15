import React, { useState, useEffect } from "react";
import { Receipt, CreditCard, Printer, CheckCircle, AlertTriangle, ArrowRight, DollarSign } from "lucide-react";
import { api } from "../../lib/api";
import PrintModal from "../common/PrintModal";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";
import { payBillWithRazorpay } from "../../lib/razorpay";

export default function BillingView() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);

  // Receipt Print State
  const [receiptDoc, setReceiptDoc] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [billStatus, setBillStatus] = useState("");
  const visibleBills = bills.filter((bill) => (!billStatus || bill.status === billStatus) && (!billSearch.trim() || [bill.bill_id, bill.patient_id?.name, bill.patient?.name].some((value) => String(value || "").toLowerCase().includes(billSearch.trim().toLowerCase()))));
  const billPagination = useListPagination(visibleBills);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await api("/billing-ops");
      setBills(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (bill) => {
    setSelectedBill(bill);
    try {
      const details = await api(`/billing-ops/${bill._id}`);
      setBillDetails(details);
      setShowDetailModal(true);
    } catch (err) {
      setError("Failed to fetch bill details: " + err.message);
    }
  };

  const handlePay = async () => {
    if (!selectedBill || paying) return;
    setError("");
    setSuccess("");
    setPaying(true);
    try {
      await payBillWithRazorpay(selectedBill._id);
      setSuccess("Payment verified by Razorpay. The invoice is paid.");
      setShowPayModal(false);
      await loadBills();
      await handlePrintReceipt(selectedBill._id);
      setPaying(false);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  const handlePrintReceipt = async (billId) => {
    try {
      const receipt = await api(`/billing-ops/${billId}/receipt`);
      setReceiptDoc(receipt);
      setShowPrint(true);
    } catch (err) {
      setError("Failed to fetch receipt: " + err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>Consolidated Billing & Healthcare Invoicing</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Consultation, prescribed medicines, lab tests, and room stays are added to the patient invoice. Unpaid invoices can be paid from here.
          </p>
        </div>
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* BILLS TABLE */}
      <div className="mb-3 flex flex-wrap gap-2"><input className="min-w-[220px] flex-1" placeholder="Search invoice or patient..." value={billSearch} onChange={(e) => setBillSearch(e.target.value)}/><select className="w-auto" value={billStatus} onChange={(e) => setBillStatus(e.target.value)}><option value="">All payment statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div>
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Patient</th>
              <th>Billing Date</th>
              <th>Consultation</th>
              <th>Pharmacy</th>
              <th>Laboratory</th>
              <th>Room Stay</th>
              <th>Grand Total</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {billPagination.pageItems.map((b) => {
              const total = b.total_amount || b.total || 0;
              const isPaid = b.status === "paid";

              return (
                <tr key={b._id}>
                  <td><strong>{b.bill_id || b._id.slice(-6)}</strong></td>
                  <td>{b.patient_id?.name || b.patient?.name || "Patient"}</td>
                  <td>{new Date(b.bill_date || b.createdAt).toLocaleDateString()}</td>
                  <td>₹{b.consultation_charges || 0}</td>
                  <td>₹{b.pharmacy_charges || 0}</td>
                  <td>₹{b.lab_charges || 0}</td>
                  <td>₹{b.room_charges || 0}</td>
                  <td className="text-[15px] font-bold text-blue-700">
                    ₹{total.toLocaleString()}
                  </td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {b.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        onClick={() => handleOpenDetails(b)}
                      >
                        Itemized Breakdown
                      </button>
                      {!isPaid ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          onClick={() => {
                            setSelectedBill(b);
                            setShowPayModal(true);
                          }}
                        >
                          <CreditCard size={13} /> Pay
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                          onClick={() => handlePrintReceipt(b._id)}
                        >
                          <Printer size={13} /> Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {bills.length === 0 && (
              <tr>
                <td colSpan="10" className="px-5 py-14 text-center text-sm text-slate-500">No billing invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...billPagination} onPageChange={billPagination.setPage} onPageSizeChange={billPagination.setPageSize}/></div>

      {/* ITEMIZED BREAKDOWN MODAL */}
      {showDetailModal && billDetails && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-w-4xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <div>
                <h2>Consolidated Bill Breakdown — {billDetails.bill?.bill_id}</h2>
                <small>Patient: {billDetails.bill?.patient_id?.name || billDetails.bill?.patient?.name}</small>
              </div>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Charge Category 1: Consultation */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4>1. Doctor Consultation Charges (Appointment_charge)</h4>
                <ul>
                  {billDetails.breakdown?.appointmentCharges?.map((c) => (
                    <li key={c._id}>
                      <span>Consultation ({c.charge_id})</span>
                      <strong>₹{c.consultation_fee}</strong>
                    </li>
                  ))}
                  {billDetails.breakdown?.appointmentCharges?.length === 0 && <li>No consultation charges.</li>}
                </ul>
              </div>

              {/* Charge Category 2: Pharmacy */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4>2. Prescription / Pharmacy Charges (Medicine_charge)</h4>
                <ul>
                  {billDetails.breakdown?.medicineCharges?.map((c) => (
                    <li key={c._id}>
                      <span>{c.medicine_name || "Medicine"} (Qty: {c.quantity})</span>
                      <strong>₹{c.amount}</strong>
                    </li>
                  ))}
                  {billDetails.breakdown?.medicineCharges?.length === 0 && <li>No pharmacy charges.</li>}
                </ul>
              </div>

              {/* Charge Category 3: Lab Tests */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4>3. Diagnostic Laboratory Charges (Test_charge)</h4>
                <ul>
                  {billDetails.breakdown?.testCharges?.map((c) => (
                    <li key={c._id}>
                      <span>{c.test_name || "Lab Investigation"} ({c.charge_id})</span>
                      <strong>₹{c.amount}</strong>
                    </li>
                  ))}
                  {billDetails.breakdown?.testCharges?.length === 0 && <li>No laboratory charges.</li>}
                </ul>
              </div>

              {/* Charge Category 4: Inpatient Stay */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4>4. Inpatient Ward / Room Stay Charges (Admission_charge)</h4>
                <ul>
                  {billDetails.breakdown?.admissionCharges?.map((c) => (
                    <li key={c._id}>
                      <span>Room {c.room_number || "Ward"} ({c.days_stayed} days @ ₹{c.daily_rate}/day)</span>
                      <strong>₹{c.amount}</strong>
                    </li>
                  ))}
                  {billDetails.breakdown?.admissionCharges?.length === 0 && <li>No room stay charges.</li>}
                </ul>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-base font-bold text-blue-800">
                <span>Grand Total:</span>
                <span className="text-2xl font-extrabold text-blue-700">₹{(billDetails.bill?.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handlePrintReceipt(billDetails.bill._id)}
              >
                <Printer size={15} /> Print Official Hospital Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS PAYMENT MODAL */}
      {showPayModal && selectedBill && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Collect Healthcare Payment</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowPayModal(false)}>×</button>
            </div>

            <div className="my-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p><strong>Invoice ID:</strong> {selectedBill.bill_id}</p>
              <p><strong>Patient:</strong> {selectedBill.patient_id?.name || selectedBill.patient?.name}</p>
              <p><strong>Total Amount Due:</strong> ₹{(selectedBill.total_amount || selectedBill.total || 0).toLocaleString()}</p>
            </div>

            <p className="text-sm text-slate-600">Pay securely by UPI, card, netbanking, or another method enabled in Razorpay. Your invoice changes to paid only after the server verifies the captured payment.</p>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button type="button" disabled={paying} onClick={handlePay} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{paying ? "Opening secure checkout…" : "Continue to Razorpay"}</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      <PrintModal
        show={showPrint}
        onClose={() => setShowPrint(false)}
        title="Official Healthcare Tax Invoice"
        data={receiptDoc}
        type="bill"
      />
    </div>
  );
}
