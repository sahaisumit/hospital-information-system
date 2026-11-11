import React, { useState, useEffect } from "react";
import { Pill, AlertTriangle, CheckCircle, Plus, ShoppingCart, Calendar } from "lucide-react";
import { api } from "../../lib/api";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function PharmacyView() {
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [listSearch, setListSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddMedModal, setShowAddMedModal] = useState(false);

  // New Medicine Form
  const [medForm, setMedForm] = useState({
    name: "",
    manufacturer: "Generic Pharma",
    unit_price: 10,
    quantity: 100,
    reorder_level: 20,
    expiry_date: "",
    batch_no: "",
    category: "General",
  });

  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const canManageInventory = ["admin", "pharmacist"].includes(user.role);
  const visibleMedicines = medicines.filter((m) => !listSearch.trim() || [m.med_id, m.name, m.manufacturer, m.batch_no].some((v) => String(v || "").toLowerCase().includes(listSearch.trim().toLowerCase())));
  const visiblePrescriptions = prescriptions.filter((p) => !listSearch.trim() || [p.pres_id, p.patient_id?.name, p.doctor_emp_id?.name, ...(p.medicines || []).map((m) => m.name)].some((v) => String(v || "").toLowerCase().includes(listSearch.trim().toLowerCase())));
  const medicinePagination = useListPagination(visibleMedicines);
  const prescriptionPagination = useListPagination(visiblePrescriptions);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [medsData, presData, pharmsData] = await Promise.all([
        api("/pharmacy-ops/medicines"),
        api("/pharmacy-ops/prescriptions"),
        api("/pharmacy-ops/pharmacies"),
      ]);
      setMedicines(medsData);
      setPrescriptions(presData);
      setPharmacies(pharmsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await api("/pharmacy-ops/medicines", {
        method: "POST",
        body: JSON.stringify(medForm),
      });
      setSuccess(`Medicine '${res.name}' successfully added to inventory!`);
      setShowAddMedModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDispense = async (prescriptionId) => {
    setError("");
    setSuccess("");
    try {
      const result = await api(`/pharmacy-ops/prescriptions/${prescriptionId}/dispense`, {
        method: "POST",
        body: JSON.stringify({ pharmacy_id: pharmacies[0]?._id }),
      });
      setSuccess(result.message);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>Pharmacy Inventory & Digital Prescriptions</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Drug catalog with batch & expiry tracking, automatic expired medicine blocking , and real-time inventory deduction with billing .
          </p>
        </div>
        <div className="flex gap-2.5">
          {canManageInventory && <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowAddMedModal(true)}>
            <Plus size={16} /> Add Medicine
          </button>}
        </div>
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700">{success}</div>}

      {/* TABS */}
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "inventory" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("inventory")}>
          Medicine Inventory ({medicines.length})
        </button>
        <button className={`whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 ${activeTab === "prescriptions" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`} onClick={() => setActiveTab("prescriptions")}>
          Doctor Prescriptions ({prescriptions.length})
        </button>
      </div>

      {/* 1. INVENTORY VIEW */}
      <div className="mb-3"><input className="w-full max-w-md" placeholder={activeTab === "inventory" ? "Filter medicines by name, code, manufacturer..." : "Filter prescriptions by patient, doctor, medicine..."} value={listSearch} onChange={(e) => setListSearch(e.target.value)}/></div>
      {activeTab === "inventory" && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Drug Code</th>
                <th>Medicine Name</th>
                <th>Manufacturer</th>
                <th>Unit Price</th>
                <th>Stock Level</th>
                <th>Batch No</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {medicinePagination.pageItems.map((m) => {
                const expiry = new Date(m.expiry_date || m.expiryDate);
                const isExpired = expiry <= new Date();
                const isLowStock = m.quantity <= (m.reorder_level || m.reorderLevel || 15);

                return (
                  <tr key={m._id}>
                    <td><strong>{m.med_id || m._id.slice(-6)}</strong></td>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.manufacturer || "Generic"}</td>
                    <td>₹{m.unit_price || m.unitPrice || 0}</td>
                    <td>
                      <span className={`rounded-lg border px-3 py-2 text-sm font-semibold ${isLowStock ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {m.quantity} units
                      </span>
                    </td>
                    <td>{m.batch_no || m.batchNo || "BATCH-01"}</td>
                    <td>{expiry ? expiry.toLocaleDateString() : "—"}</td>
                    <td>
                      {isExpired ? (
                        <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700"><AlertTriangle size={13} /> EXPIRED</span>
                      ) : isLowStock ? (
                        <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">LOW STOCK</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700">IN STOCK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === "inventory" && <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...medicinePagination} onPageChange={medicinePagination.setPage} onPageSizeChange={medicinePagination.setPageSize}/></div>}

      {/* 2. PRESCRIPTIONS VIEW */}
      {activeTab === "prescriptions" && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table>
            <thead>
              <tr>
                <th>Rx ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Prescribed Medicines</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptionPagination.pageItems.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.pres_id || p._id.slice(-6)}</strong></td>
                  <td>{p.patient_id?.name || p.patient?.name || "Patient"}</td>
                  <td>{p.doctor_emp_id?.name || p.doctor?.name || "Doctor"}</td>
                  <td><ul className="space-y-1 text-xs text-slate-700">{p.medicines?.map((item, idx) => <li key={idx}><strong>{item.name}</strong>: {item.quantity} unit(s), {item.dosage}{item.duration ? ` for ${item.duration}` : ""}</li>)}</ul></td>
                  <td>{new Date(p.prescription_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${p.status === "dispensed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                      {p.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {p.status !== "dispensed" ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        onClick={() => handleDispense(p._id)}
                      >
                        <ShoppingCart size={13} /> Dispense & Bill
                      </button>
                    ) : (
                      <span className="text-slate-500"><CheckCircle size={14} color="#15803d" /> Dispensed</span>
                    )}
                  </td>
                </tr>
              ))}
              {prescriptions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-14 text-center text-sm text-slate-500">No prescriptions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === "prescriptions" && <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...prescriptionPagination} onPageChange={prescriptionPagination.setPage} onPageSizeChange={prescriptionPagination.setPageSize}/></div>}

      {/* ADD MEDICINE MODAL */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleAddMedicine}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Add Medicine to Inventory</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowAddMedModal(false)}>×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                Medicine Name
                <input
                  required
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                  placeholder="e.g. Ciprofloxacin 500mg"
                />
              </label>

              <label>
                Manufacturer
                <input
                  value={medForm.manufacturer}
                  onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })}
                  placeholder="e.g. Cipla, Sun Pharma"
                />
              </label>

              <label>
                Unit Price (₹)
                <input
                  type="number"
                  step="0.01"
                  required
                  value={medForm.unit_price}
                  onChange={(e) => setMedForm({ ...medForm, unit_price: Number(e.target.value) })}
                />
              </label>

              <label>
                Quantity in Stock
                <input
                  type="number"
                  required
                  value={medForm.quantity}
                  onChange={(e) => setMedForm({ ...medForm, quantity: Number(e.target.value) })}
                />
              </label>

              <label>
                Batch Number
                <input
                  required
                  value={medForm.batch_no}
                  onChange={(e) => setMedForm({ ...medForm, batch_no: e.target.value })}
                  placeholder="e.g. BATCH-2026-X"
                />
              </label>

              <label>
                Expiry Date:
                <input
                  type="date"
                  required
                  value={medForm.expiry_date}
                  onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowAddMedModal(false)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Add Drug Record</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
