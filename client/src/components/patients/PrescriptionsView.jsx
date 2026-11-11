import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, FileText, Pencil, Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";

export default function PrescriptionsView() {
  const location = useLocation();
  const appointmentFromRoute = location.state?.appointmentId || "";
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(appointmentFromRoute);
  const [instructions, setInstructions] = useState("");
  const [medicineRows, setMedicineRows] = useState([
    { med_id: "", quantity: 1, dosage: "", duration: "" },
  ]);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [showForm, setShowForm] = useState(Boolean(appointmentFromRoute));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const isDoctor = user.role === "doctor";
  const visiblePrescriptions = prescriptions.filter((item) => !prescriptionSearch.trim() || [item.pres_id, item.patient_id?.name, item.doctor_emp_id?.name, item.appointment_id?.appointment_id, ...(item.medicines || []).map((medicine) => medicine.name)].some((value) => String(value || "").toLowerCase().includes(prescriptionSearch.trim().toLowerCase())));
  const prescriptionPagination = useListPagination(visiblePrescriptions);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const prescriptionList = await api("/pharmacy-ops/prescriptions");
      setPrescriptions(prescriptionList);

      if (isDoctor) {
        const [appointmentList, medicineList, pharmacyList] = await Promise.all([
          api("/appointment-ops"),
          api("/pharmacy-ops/medicines"),
          api("/pharmacy-ops/pharmacies"),
        ]);
        const alreadyPrescribed = new Set(
          prescriptionList
            .map((item) => item.appointment_id?._id || item.appointment_id)
            .filter(Boolean)
            .map(String),
        );
        const readyAppointments = appointmentList.filter((item) =>
          item.payment_status === "paid" &&
          item.status === "scheduled" &&
          !alreadyPrescribed.has(String(item._id)),
        );
        setAppointments(readyAppointments);
        setMedicines(medicineList);
        setPharmacies(pharmacyList);
        setSelectedAppointment((current) => {
          if (appointmentFromRoute && readyAppointments.some((item) => item._id === appointmentFromRoute)) {
            return appointmentFromRoute;
          }
          return readyAppointments.some((item) => item._id === current)
            ? current
            : readyAppointments[0]?._id || "";
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (appointmentFromRoute) {
      setEditingPrescription(null);
      setSelectedAppointment(appointmentFromRoute);
      setShowForm(true);
    }
  }, [appointmentFromRoute]);

  const resetForm = () => {
    setShowForm(false);
    setEditingPrescription(null);
    setInstructions("");
    setMedicineRows([{ med_id: "", quantity: 1, dosage: "", duration: "" }]);
    setError("");
  };

  const startEditing = (prescription) => {
    const prescriptionMedicines = prescription.medicines?.length
      ? prescription.medicines
      : [{ med_id: "", quantity: 1, dosage: "", duration: "" }];
    setEditingPrescription(prescription);
    setSelectedAppointment(prescription.appointment_id?._id || prescription.appointment_id || "");
    setInstructions(prescription.instructions || "");
    setMedicineRows(prescriptionMedicines.map((medicine) => ({
      med_id: medicine.med_id?._id || medicine.med_id || "",
      quantity: medicine.quantity || 1,
      dosage: medicine.dosage || "",
      duration: medicine.duration || "",
    })));
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const savePrescription = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload = {
      appointment_id: selectedAppointment,
      pharmacy_id: pharmacies[0]?._id,
      instructions,
      medicines: medicineRows.map((row) => {
        const medicine = medicines.find((item) => item._id === row.med_id);
        return {
          med_id: row.med_id,
          name: medicine?.name,
          quantity: Number(row.quantity),
          dosage: row.dosage,
          duration: row.duration,
          unit_price: medicine?.unit_price || medicine?.unitPrice || 0,
        };
      }),
    };

    try {
      if (editingPrescription) {
        const result = await api(`/pharmacy-ops/prescriptions/${editingPrescription._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess(`Prescription ${result.pres_id} updated. The appointment remains completed.`);
      } else {
        const result = await api("/pharmacy-ops/prescriptions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess(`Prescription ${result.pres_id} saved. The appointment is now completed.`);
      }
      resetForm();
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const updateMedicineRow = (index, key, value) => {
    setMedicineRows((rows) => rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: value } : row,
    ));
  };

  const addMedicineRow = () => {
    setMedicineRows((rows) => [...rows, { med_id: "", quantity: 1, dosage: "", duration: "" }]);
  };

  const appointmentLabel = (appointment) => {
    const patientName = appointment.patient_id?.name || appointment.patient?.name || "Patient";
    const date = appointment.appointment_date
      ? new Date(appointment.appointment_date).toLocaleDateString()
      : "Date unavailable";
    return `${appointment.appointment_id || "Appointment"} · ${patientName} · ${date}`;
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>{user.role === "patient" ? "My Prescriptions" : isDoctor ? "My Prescriptions" : "Prescriptions"}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {isDoctor
              ? "Review prescriptions you have written and complete prescriptions for your scheduled appointments."
              : "Prescriptions shared with the patient and authorized care team."}
          </p>
        </div>
        {isDoctor && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => { setEditingPrescription(null); setError(""); setShowForm(true); }}
            disabled={!appointments.length}
          >
            <Plus size={16} /> Write prescription
          </button>
        )}
      </div>

      {error && !showForm && <div role="alert" className="my-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} /> {success}</div>}

      <div className="mb-3"><input className="w-full max-w-md" placeholder="Filter prescriptions by patient, doctor, medicine..." value={prescriptionSearch} onChange={(e) => setPrescriptionSearch(e.target.value)}/></div>
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Prescription</th><th>Patient</th><th>Doctor</th><th>Appointment</th>
              <th>Visit status</th><th>Medicines / Instructions</th><th>Date</th>
              {isDoctor && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {prescriptionPagination.pageItems.map((prescription) => {
              const visitStatus = prescription.appointment_id?.status;
              return (
                <tr key={prescription._id}>
                  <td><strong>{prescription.pres_id}</strong></td>
                  <td>{prescription.patient_id?.name || prescription.patient?.name || "Patient"}</td>
                  <td>{prescription.doctor_emp_id?.name || prescription.doctor?.name || "Doctor"}</td>
                  <td>{prescription.appointment_id?.appointment_id || "—"}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${visitStatus === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {visitStatus || "—"}
                    </span>
                  </td>
                  <td>{prescription.medicines?.map((item) => `${item.name} (${item.dosage || "as directed"}${item.duration ? `, ${item.duration}` : ""})`).join(", ") || prescription.instructions || "—"}</td>
                  <td>{prescription.prescription_date ? new Date(prescription.prescription_date).toLocaleDateString() : "—"}</td>
                  {isDoctor && (
                    <td>
                      {prescription.status === "prescribed" ? (
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100" onClick={() => startEditing(prescription)}>
                          <Pencil size={14} /> Edit prescription
                        </button>
                      ) : <span className="text-xs text-slate-500">{prescription.status}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
            {!loading && !prescriptions.length && (
              <tr><td colSpan={isDoctor ? 8 : 7} className="px-5 py-14 text-center text-sm text-slate-500">
                <FileText size={22} className="mx-auto mb-2 text-slate-400" />
                No prescriptions available.
              </td></tr>
            )}
            {loading && <tr><td colSpan={isDoctor ? 8 : 7} className="px-5 py-10 text-center text-sm text-slate-500">Loading prescriptions…</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...prescriptionPagination} onPageChange={prescriptionPagination.setPage} onPageSizeChange={prescriptionPagination.setPageSize}/></div>

      {showForm && isDoctor && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-2xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" onSubmit={savePrescription}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-1">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText size={19} /> {editingPrescription ? "Edit prescription" : "Write prescription"}</h2>
                {editingPrescription && <p className="mt-1 text-xs text-slate-500">Editing {editingPrescription.pres_id}; the visit remains completed.</p>}
              </div>
              <button type="button" aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={resetForm}><X size={18} /></button>
            </div>

            {editingPrescription ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Appointment {editingPrescription.appointment_id?.appointment_id || "—"} · {editingPrescription.patient_id?.name || editingPrescription.patient?.name || "Patient"} · Completed
              </div>
            ) : (
              <label className="block text-sm font-medium text-slate-700">Patient appointment
                <select className="mt-1 w-full" value={selectedAppointment} onChange={(event) => setSelectedAppointment(event.target.value)} required>
                  {appointments.map((item) => <option key={item._id} value={item._id}>{appointmentLabel(item)}</option>)}
                </select>
              </label>
            )}
            {!editingPrescription && !appointments.length && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">There are no paid, scheduled appointments available to prescribe.</p>}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">Prescribed medicines</h3>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100" onClick={addMedicineRow}>
                  <Plus size={14} /> Add medicine
                </button>
              </div>
              {medicineRows.map((row, index) => (
                <div key={`medicine-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Medicine {index + 1}</span>
                    {medicineRows.length > 1 && (
                      <button type="button" aria-label={`Remove medicine ${index + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setMedicineRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <label className="block text-sm font-medium text-slate-700">Medicine
                    <select className="mt-1 w-full" value={row.med_id} onChange={(event) => updateMedicineRow(index, "med_id", event.target.value)} required>
                      <option value="">Select a medicine</option>
                      {medicines.map((item) => <option key={item._id} value={item._id}>{item.name} · Stock {item.quantity}</option>)}
                    </select>
                  </label>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="block text-sm font-medium text-slate-700">Quantity<input className="mt-1 w-full" type="number" min="1" value={row.quantity} onChange={(event) => updateMedicineRow(index, "quantity", event.target.value)} required /></label>
                    <label className="block text-sm font-medium text-slate-700">Dosage<input className="mt-1 w-full" value={row.dosage} onChange={(event) => updateMedicineRow(index, "dosage", event.target.value)} placeholder="1 tablet twice daily" required /></label>
                    <label className="block text-sm font-medium text-slate-700">Duration<input className="mt-1 w-full" value={row.duration} onChange={(event) => updateMedicineRow(index, "duration", event.target.value)} placeholder="5 days" /></label>
                  </div>
                </div>
              ))}
            </div>
            <label className="block text-sm font-medium text-slate-700">Clinical instructions<textarea className="mt-1 w-full" rows="3" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Additional directions for the patient or pharmacy" /></label>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={resetForm}>Cancel</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={!editingPrescription && (!appointments.length || !selectedAppointment)}>{editingPrescription ? "Save changes" : "Save prescription & complete visit"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
