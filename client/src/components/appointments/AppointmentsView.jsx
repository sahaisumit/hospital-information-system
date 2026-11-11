import React, { useState, useEffect } from "react";
import { CalendarDays, Clock, Plus, Printer, CheckCircle, AlertTriangle, User, Stethoscope, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import PrintModal from "../common/PrintModal";
import { useNavigate } from "react-router-dom";
import Pagination from "../common/Pagination";
import useListPagination from "../../hooks/useListPagination";
import { payBillWithRazorpay } from "../../lib/razorpay";

const todayLocal = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export default function AppointmentsView() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [payingAppointment, setPayingAppointment] = useState(false);
  const [cashAppointment, setCashAppointment] = useState(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashReceipt, setCashReceipt] = useState("");
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [doctorDepartmentFilter, setDoctorDepartmentFilter] = useState("");
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState("");

  // Print slip state
  const [printDoc, setPrintDoc] = useState(null);
  const [showPrint, setShowPrint] = useState(false);

  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const isPatient = user.role === "patient";
  const canBook = ["patient", "receptionist", "admin"].includes(user.role);
  const canCollectCash = ["admin", "receptionist", "accountant"].includes(user.role);
  const isDoctor = user.role === "doctor";
  const filteredAppointments = appointments.filter((a) => {
    const d = a.doctor_emp_id || a.doctor || {};
    const patientName = a.patient_id?.name || a.patient?.name || "";
    const query = appointmentSearch.trim().toLowerCase();
    return (!query || [a.appointment_id, patientName, d.name, a.reason, a.status].some((value) => String(value || "").toLowerCase().includes(query)))
      && (!doctorDepartmentFilter || d.department === doctorDepartmentFilter)
      && (!doctorSpecialtyFilter || d.specialization === doctorSpecialtyFilter);
  });
  const appointmentPagination = useListPagination(filteredAppointments);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [apptsData, docsData] = await Promise.all([
        api("/appointment-ops"),
        api("/doctors"),
      ]);

      setAppointments(apptsData);
      setDoctors(docsData);

      if (docsData.length > 0) {
        // Prefer an available doctor by default
        const firstAvailable = docsData.find((d) => d.is_available !== false) || docsData[0];
        setSelectedDoctor(firstAvailable._id);
      }

      if (!isPatient) {
        const patsData = await api("/patients").catch(() => []);
        setPatients(patsData);
        if (patsData.length > 0) setSelectedPatient(patsData[0]._id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Check doctor availability when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailability(null);
      setSelectedSlot("");
      setAvailabilityLoading(false);
      return undefined;
    }

    let currentRequest = true;
    setAvailability(null);
    setAvailabilityError("");
    setAvailabilityLoading(true);
    setSelectedSlot("");

    api(`/appointment-ops/doctor/${selectedDoctor}/availability?date=${encodeURIComponent(selectedDate)}`)
      .then((data) => {
        if (!currentRequest) return;
        setAvailability(data);
        const firstAvailable = data.slots?.find((slot) => slot.available)?.start_time || "";
        setSelectedSlot(firstAvailable);
      })
      .catch((error) => {
        if (!currentRequest) return;
        setAvailability(null);
        setAvailabilityError(error.message || "Could not load appointment times. Please try again.");
      })
      .finally(() => {
        if (currentRequest) setAvailabilityLoading(false);
      });

    return () => {
      currentRequest = false;
    };
  }, [selectedDoctor, selectedDate]);

  const selectedDoctorObj = doctors.find((d) => d._id === selectedDoctor);
  const isDoctorAvailable = selectedDoctorObj?.is_available !== false && availability?.is_available !== false;

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isDoctorAvailable) {
      setError(`Cannot book: Dr. ${selectedDoctorObj?.name || "Selected doctor"} is currently marked as Not Available.`);
      return;
    }

    try {
      const consultationFee = Number(selectedDoctorObj?.consultation_fee ?? selectedDoctorObj?.consultationFee ?? 500);
      const payload = {
        patient_id: isPatient ? (user.patient_id || undefined) : selectedPatient,
        doctor_emp_id: selectedDoctor,
        appointment_date: selectedDate,
        start_time: selectedSlot,
        reason: reason || "General Outpatient Consultation",
        payment_amount: consultationFee,
        payment_method: paymentMethod,
      };

      const result = await api("/appointment-ops", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      setReason("");
      if (paymentMethod === "Razorpay") {
        if (!result.payment_bill_id) throw new Error("Appointment was reserved, but its invoice was not created. Open Billing to complete payment.");
        await payBillWithRazorpay(result.payment_bill_id, "Doctor consultation fee");
        setSuccess(`Payment verified. Appointment ${result.appointment_id} is confirmed.`);
      } else {
        setSuccess(`Appointment ${result.appointment_id} reserved. Collect ₹${result.consultation_fee} at reception before the visit.`);
      }
      await loadData();

      // Open print slip automatically
      handlePrintSlip(result._id);
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  };

  const handleAppointmentPayment = async (appointment) => {
    if (!appointment.payment_bill_id || payingAppointment) return;
    setError("");
    setPayingAppointment(true);
    try {
      await payBillWithRazorpay(appointment.payment_bill_id, "Doctor consultation fee");
      setSuccess(`Payment verified. Appointment ${appointment.appointment_id} is confirmed.`);
      await loadData();
    } catch (err) {
      setError(err.message);
      await loadData();
    } finally {
      setPayingAppointment(false);
    }
  };

  const handlePrintSlip = async (id) => {
    try {
      const slipData = await api(`/appointment-ops/${id}/slip`);
      setPrintDoc(slipData);
      setShowPrint(true);
    } catch (err) {
      setError("Failed to generate appointment slip: " + err.message);
    }
  };

  const handleCashPayment = async (e) => {
    e.preventDefault();
    if (!cashAppointment) return;
    setError("");
    try {
      const result = await api(`/appointment-ops/${cashAppointment._id}/cash-payment`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(cashAmount), receipt_number: cashReceipt }),
      });
      setSuccess(result.message);
      setCashAppointment(null);
      setCashAmount("");
      setCashReceipt("");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 mx-auto w-full max-w-screen-2xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2>
            {isPatient ? "My Consultations & Appointments" : "Appointment Scheduling & Doctor Slots"}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {isPatient
              ? "Book 30-minute consultation slots with your preferred specialist doctor and view confirmation slips."
              : "30-minute time-slot consultations with doctor schedule conflict prevention and daily quota enforcement (Max 20/day)."}
          </p>
        </div>
        {canBook && <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowModal(true)}>
          <Plus size={16} /> {isPatient ? "Book My Appointment" : "Book Appointment"}
        </button>}
      </div>

      {error && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700"><AlertTriangle size={18} /> {error}</div>}
      {success && <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle size={18} /> {success}</div>}

      {/* Appointments List Table */}
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="min-w-[220px] flex-1" placeholder="Search appointments, patients, doctors..." value={appointmentSearch} onChange={(e) => setAppointmentSearch(e.target.value)}/>
        <select className="w-auto" value={doctorDepartmentFilter} onChange={(e) => setDoctorDepartmentFilter(e.target.value)}><option value="">All departments</option>{[...new Set(doctors.map((d) => d.department).filter(Boolean))].sort().map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <select className="w-auto" value={doctorSpecialtyFilter} onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}><option value="">All specialisations</option>{[...new Set(doctors.map((d) => d.specialization).filter(Boolean))].sort().map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Appt ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Slot (30m)</th>
              <th>Status</th>
              <th>Fee</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointmentPagination.pageItems.map((a) => (
              <tr key={a._id}>
                <td><strong>{a.appointment_id || a._id.slice(-6)}</strong></td>
                <td>
                  {a.patient_id?.name || a.patient?.name || (isPatient ? user.name : "Patient")}
                  {isPatient && <small className="text-slate-500 block"> (You)</small>}
                </td>
                <td>{a.doctor_emp_id?.name || a.doctor?.name || "Doctor"}</td>
                <td>{new Date(a.appointment_date || a.date).toLocaleDateString()}</td>
                <td>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                    <Clock size={13} /> {a.start_time || "10:00"} - {a.end_time || "10:30"}
                  </span>
                </td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${a.status === "completed" || a.status === "attended" ? "bg-emerald-50 text-emerald-700" : a.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                    {a.status?.toUpperCase()}
                  </span>
                </td>
                <td>₹{a.consultation_fee ?? 500}</td>
                <td><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${a.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{a.payment_status === "paid" ? "PAID" : `DUE${a.payment_method === "Cash" ? " · CASH" : ""}`}</span></td>
                <td>
                  <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    title="Print Confirmation Slip"
                    onClick={() => handlePrintSlip(a._id)}
                  >
                    <Printer size={15} /> Slip
                  </button>
                  {canCollectCash && a.payment_method === "Cash" && a.payment_status !== "paid" && <button type="button" className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => { setCashAppointment(a); setCashAmount(String(a.consultation_fee || 500)); setCashReceipt(""); }}>Record cash</button>}
                  {a.payment_method !== "Cash" && a.payment_status !== "paid" && a.payment_bill_id && <button type="button" disabled={payingAppointment} className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => handleAppointmentPayment(a)}>{payingAppointment ? "Opening…" : `Pay invoice ₹${Number(a.payment_bill_amount_due || 0).toLocaleString()}`}</button>}
                  {isDoctor && a.status === "scheduled" && a.payment_status === "paid" && <button type="button" className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => navigate("/prescriptions", { state: { appointmentId: a._id } })}>Write prescription</button>}
                  {isDoctor && String(a.reason || "").startsWith("Doctor referral from") && <button type="button" className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800" onClick={() => navigate("/beds", { state: { patientId: a.patient_id?._id || a.patient?._id || a.patient_id } })}>Admit patient</button>}
                  </div>
                </td>
              </tr>
            ))}
            {filteredAppointments.length === 0 && (
              <tr>
                <td colSpan="9" className="px-5 py-14 text-center text-sm text-slate-500">
                  {isPatient
                    ? "You have no appointments scheduled. Click 'Book My Appointment' above to schedule one!"
                    : "No appointments scheduled yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white"><Pagination {...appointmentPagination} onPageChange={appointmentPagination.setPage} onPageSizeChange={appointmentPagination.setPageSize}/></div>

      {/* BOOK APPOINTMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] content-start scroll-pt-3" onSubmit={handleBookAppointment}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>{isPatient ? "Book Your Doctor Consultation" : "Book Consultation Slot "}</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* PATIENT SELECTION: Locked to current user if patient */}
            {isPatient ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {user.name?.[0]?.toUpperCase() || "P"}
                </div>
                <div>
                  <div className="text-sm text-slate-800">
                    <strong>{user.name}</strong> (Self Booking)
                  </div>
                  <small className="block text-xs text-slate-500">
                    Email: {user.email} • ID: {user.patient_id ? "PAT-" + user.patient_id.slice(-4) : "Registered Patient"}
                  </small>
                </div>
              </div>
            ) : (
              <label>
                Select Patient
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  required
                >
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.patient_id || p.patientId}) - {p.status || "OPD"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* DOCTOR SELECTION WITH LIVE AVAILABILITY STATUS */}
            <label>
              Consulting Doctor & Live Availability
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                {doctors.map((d) => {
                  const isAvail = d.is_available !== false;
                  return (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.specialization || d.department}) - Fee: ₹{d.consultation_fee || d.consultationFee || 500} {isAvail ? "[● Available]" : `[● NOT AVAILABLE - ${d.status_note || "Off Duty"}]`}
                    </option>
                  );
                })}
              </select>
            </label>

            {/* DOCTOR AVAILABILITY WARNING BANNER */}
            {!isDoctorAvailable && (
              <div className="my-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-red-200 bg-red-50 text-red-700">
                <XCircle size={18} />
                <div>
                  <strong>Doctor is currently Not Available:</strong>{" "}
                  Dr. {selectedDoctorObj?.name} is marked as Not Available ({selectedDoctorObj?.status_note || availability?.status_note || "Off Duty"}).
                  Please choose another doctor to schedule your consultation.
                </div>
              </div>
            )}

            {isDoctorAvailable && (
              <div className="my-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
                <ShieldCheck size={16} />
                <span>
                  Dr. {selectedDoctorObj?.name} is <strong>Available</strong> ({selectedDoctorObj?.status_note || "On Duty"}).
                </span>
              </div>
            )}

            <label>
              Appointment Date (No Past Dates)
              <input
                type="date"
                min={todayLocal()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </label>

            {/* Doctor Daily Quota Info (Trigger 9) */}
            {availability && isDoctorAvailable && (
              <div className="my-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <strong>Doctor Daily Quota:</strong> {availability.totalBooked} / {availability.maxAllowed} booked on this date.
                {availability.totalBooked >= 20 && (
                  <span className="text-red-700"> Limit reached for this doctor on this day.</span>
                )}
              </div>
            )}

            {/* 30-Minute Time Slot Picker */}
            <label>
              Select 30-Min Time Slot (Conflict Prevention)
              <div className="mt-2 flex flex-wrap gap-2">
                {availability?.slots?.map((slot) => (
                  <button
                    type="button"
                    key={slot.start_time}
                    aria-pressed={selectedSlot === slot.start_time}
                    title={slot.available ? `Select ${slot.start_time}` : `${slot.start_time} is already booked`}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${selectedSlot === slot.start_time ? "border-blue-700 bg-blue-700 text-white shadow-sm" : "border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50"} ${!slot.available || !isDoctorAvailable ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 hover:bg-slate-100" : "cursor-pointer"}`}
                    disabled={availabilityLoading || !slot.available || !isDoctorAvailable}
                    onClick={() => setSelectedSlot(slot.start_time)}
                  >
                    {slot.start_time}
                  </button>
                ))}
                {availabilityLoading && (
                  <small>Loading available consultation slots...</small>
                )}
                {availabilityError && <small className="text-red-700">{availabilityError}</small>}
                {availability && isDoctorAvailable && !availabilityLoading && !availability.slots?.some((slot) => slot.available) && <small className="text-amber-700">No appointment times are available on this date. Select another date or doctor.</small>}
              </div>
            </label>

            <label>
              Reason for Visit / Clinical Symptoms
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest pain follow-up, general health check, fever and cold, blood pressure review"
                rows={2}
              />
            </label>

            <div className="my-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <strong>Consultation charge: ₹{selectedDoctorObj?.consultation_fee ?? selectedDoctorObj?.consultationFee ?? 500}</strong>
              <p>Payment is required before the appointment is confirmed.</p>
              <label>
                Payment method
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                  <option value="Razorpay">Razorpay · UPI, card &amp; netbanking</option>
                  <option value="Cash">Cash at reception</option>
                </select>
              </label>
              {paymentMethod === "Cash"
                ? <small>The appointment stays unpaid until reception or accounts records the cash receipt.</small>
                : <small>Checkout opens securely through Razorpay. The appointment is confirmed only after payment verification.</small>}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={availabilityLoading || !isDoctorAvailable || !availability || availability.totalBooked >= 20 || !availability.slots?.some((slot) => slot.start_time === selectedSlot && slot.available)}
              >
                {paymentMethod === "Cash" ? "Reserve and pay at reception" : `Pay ₹${selectedDoctorObj?.consultation_fee ?? selectedDoctorObj?.consultationFee ?? 500} & Confirm`}
              </button>
            </div>
          </form>
        </div>
      )}

      {cashAppointment && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={handleCashPayment}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3">
              <h2>Record cash consultation payment</h2>
              <button type="button" className="rounded-md p-2 text-xl text-slate-500 hover:bg-slate-100" onClick={() => setCashAppointment(null)}>×</button>
            </div>
            <div className="my-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p><strong>Appointment:</strong> {cashAppointment.appointment_id}</p>
              <p><strong>Patient:</strong> {cashAppointment.patient_id?.name || cashAppointment.patient?.name || "Patient"}</p>
              <p><strong>Amount due:</strong> ₹{cashAppointment.consultation_fee || 500}</p>
            </div>
            <label>Cash received (₹)
              <input type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} required />
            </label>
            <label>Cash receipt number
              <input value={cashReceipt} onChange={(e) => setCashReceipt(e.target.value)} placeholder="Enter the receipt issued at reception" required />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setCashAppointment(null)}>Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Confirm cash received</button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT CONFIRMATION SLIP MODAL */}
      <PrintModal
        show={showPrint}
        onClose={() => setShowPrint(false)}
        title="Appointment Confirmation Slip"
        data={printDoc}
        type="appointment"
      />
    </div>
  );
}
