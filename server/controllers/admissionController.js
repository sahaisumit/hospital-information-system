import mongoose from "mongoose";
import {
  Admission,
  Room,
  Patient,
  Doctor,
  MedicalStaff,
  NurseAssignment,
  Appointment,
} from "../models/index.js";
import { TriggerEngine } from "../services/triggerEngine.js";

const nurseRecordId = async (user) => {
  if (!user?.emp_id) return null;
  const staff = await MedicalStaff.findOne({ emp_id: user.emp_id }).select("_id");
  return staff?._id || user.emp_id;
};

export const getRooms = async (req, res) => {
  try {
    let query = Room.find();
    if (req.user?.role === "nurse") {
      const assigned = await NurseAssignment.find({ nurse_emp_id: await nurseRecordId(req.user), active: true }).distinct("admission_id");
      const admissions = await Admission.find({ _id: { $in: assigned }, status: "admitted" }).distinct("patient_id");
      query = query.where({ patient: { $in: admissions } });
    }
    const list = await query.populate("patient").sort({ room_number: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const count = await Room.countDocuments();
    const room_id = req.body.room_id || `RM-${String(count + 101).padStart(3, "0")}`;
    const newRoom = await Room.create({
      ...req.body,
      room_id,
      bedNumber: req.body.room_number || req.body.bedNumber,
      ward: req.body.room_type || req.body.ward,
    });
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getAdmissions = async (req, res) => {
  try {
    const { status, patient } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (patient) filter.patient_id = patient;
    if (req.user?.role === "nurse") {
      const assigned = await NurseAssignment.find({ nurse_emp_id: await nurseRecordId(req.user), active: true }).distinct("admission_id");
      filter._id = { $in: assigned };
    }
    if (req.user?.role === "doctor") filter.doctor_emp_id = req.user.emp_id;

    const list = await Admission.find(filter)
      .populate("patient_id")
      .populate("room_id")
      .populate("doctor_emp_id")
      .populate("assigned_nurse")
      .sort({ admission_date: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DFD 8.0 & 11: Patient Admission Flow
export const admitPatient = async (req, res) => {
  try {
    const {
      patient_id,
      patient,
      room_id,
      doctor_emp_id,
      doctor,
      admission_date,
      diagnosis,
      notes,
    } = req.body;

    const actualPatientId = patient_id || patient;
    const actualDoctorId = req.user?.role === "doctor" ? req.user.emp_id : (doctor_emp_id || doctor);
    if (req.user?.role === "nurse") return res.status(403).json({ message: "Nurses cannot admit patients. A doctor or administrator must create the admission." });
    if (!actualDoctorId) return res.status(400).json({ message: "An attending doctor is required" });

    // RUN TRIGGER 16: Ensure patient doesn't already have an active admission
    await TriggerEngine.checkSingleAdmission(actualPatientId);

    // RUN TRIGGER 17: Ensure room is available
    const room = await TriggerEngine.checkRoomAvailable(room_id);

    const count = await Admission.countDocuments();
    const admission_id = req.body.admission_id || `ADM-${String(count + 1001).padStart(4, "0")}`;

    const newAdmission = await Admission.create({
      admission_id,
      room_id,
      patient_id: actualPatientId,
      patient: actualPatientId,
      doctor_emp_id: actualDoctorId,
      doctor: actualDoctorId,
      admission_date: admission_date || new Date(),
      status: "admitted",
      diagnosis: diagnosis || "Inpatient Care Observation",
      notes,
    });

    // RUN TRIGGER 18: Mark room occupied and patient as IPD
    await TriggerEngine.markRoomOccupied(room_id, actualPatientId);

    // RUN TRIGGER 21: Smart workload-balanced nurse assignment
    const assignedNurse = await TriggerEngine.autoAssignNurse(newAdmission);

    // RUN TRIGGER 22: Ensure a pending master bill exists for patient
    await TriggerEngine.createBillAfterAdmission(newAdmission);

    // Update patient record with active admission
    await Patient.findByIdAndUpdate(actualPatientId, {
      active_admission_id: newAdmission._id,
      status: "IPD",
    });

    const populated = await Admission.findById(newAdmission._id)
      .populate("patient_id")
      .populate("room_id")
      .populate("doctor_emp_id")
      .populate("assigned_nurse");

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DFD 8.0 & 11: Patient Discharge Flow
export const dischargePatient = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: "Admission record not found" });
    if (req.user?.role === "nurse") return res.status(403).json({ message: "Nurses cannot discharge patients. Contact the attending doctor or administrator." });
    if (req.user?.role === "doctor" && String(admission.doctor_emp_id) !== String(req.user.emp_id)) return res.status(403).json({ message: "Only the attending doctor can discharge this patient." });

    if (admission.status === "discharged") {
      return res.status(400).json({ message: "Patient is already discharged" });
    }

    const dischargeDate = req.body.discharge_date || new Date();

    // RUN TRIGGER 19: Discharge date must be after admission date
    TriggerEngine.validateDischargeDate(admission.admission_date, dischargeDate);

    admission.discharge_date = dischargeDate;
    admission.status = "discharged";
    admission.notes = req.body.notes || admission.notes;
    await admission.save();

    // RUN TRIGGER 20: Free the room (status -> available)
    await TriggerEngine.freeRoomOnDischarge(admission.room_id, admission.patient_id);

    // RUN TRIGGER 23: Calculate stay charges based on days stayed & room rate, add to bill
    await TriggerEngine.addAdmissionCharge(admission);

    // Clear active admission from patient
    await Patient.findByIdAndUpdate(admission.patient_id, {
      active_admission_id: null,
      status: "Discharged",
    });

    res.json({
      message: "Patient discharged successfully. Room freed and stay charges billed.",
      admission,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const forwardPatient = async (req, res) => {
  try {
    if (req.user?.role !== "doctor") return res.status(403).json({ message: "Only a doctor can forward a patient to another doctor." });
    const { patient_id, doctor_emp_id, reason } = req.body;
    if (!patient_id || !doctor_emp_id || String(doctor_emp_id) === String(req.user.emp_id)) return res.status(400).json({ message: "Choose another doctor and a patient to forward." });
    const [patient, recipient] = await Promise.all([Patient.findById(patient_id), Doctor.findById(doctor_emp_id)]);
    if (!patient || !recipient) return res.status(404).json({ message: "Patient or receiving doctor not found." });
    if (recipient.is_available === false) return res.status(409).json({ message: `Dr. ${recipient.name} is currently unavailable.` });
    const referralSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
    let day, referralSlot;
    for (let offset = 1; offset <= 7 && !referralSlot; offset += 1) {
      const date = new Date(); date.setUTCDate(date.getUTCDate() + offset);
      day = date.toISOString().slice(0, 10);
      const start = new Date(`${day}T00:00:00.000Z`);
      const end = new Date(`${day}T23:59:59.999Z`);
      const used = await Appointment.find({ doctor_emp_id: recipient._id, appointment_date: { $gte: start, $lte: end }, status: { $ne: "cancelled" } }).select("start_time");
      const usedSlots = new Set(used.map((appointment) => appointment.start_time));
      referralSlot = referralSlots.find((slot) => !usedSlots.has(slot));
    }
    if (!referralSlot) return res.status(409).json({ message: "The receiving doctor has no available referral slot in the next seven days." });
    const [slotHour, slotMinute] = referralSlot.split(":").map(Number);
    const slotEnd = `${String(slotHour + (slotMinute === 30 ? 1 : 0)).padStart(2, "0")}:${slotMinute === 30 ? "00" : "30"}`;
    const count = await Appointment.countDocuments();
    const referral = await Appointment.create({
      appointment_id: `REF-${Date.now()}-${String(count + 1).padStart(3, "0")}`,
      patient_id: patient._id, patient: patient._id,
      doctor_emp_id: recipient._id, doctor: recipient._id,
      appointment_date: day, date: day, start_time: referralSlot, end_time: slotEnd,
      status: "scheduled", reason: `Doctor referral from ${req.user.name || "attending doctor"}: ${reason || "Clinical review and admission assessment"}`,
      notes: `Referred by doctor ${req.user.emp_id}`,
      consultation_fee: 0, payment_status: "paid", payment_method: "Referral",
    });
    const populated = await Appointment.findById(referral._id).populate("patient_id").populate("doctor_emp_id");
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const getDischargeSummary = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate("patient_id")
      .populate("room_id")
      .populate("doctor_emp_id")
      .populate("assigned_nurse");

    if (!admission) return res.status(404).json({ message: "Admission not found" });
    if (req.user?.role === "nurse" && String(admission.assigned_nurse?._id || admission.assigned_nurse) !== String(await nurseRecordId(req.user))) return res.status(403).json({ message: "You can only view summaries for patients assigned to your account." });
    if (req.user?.role === "doctor" && String(admission.doctor_emp_id?._id || admission.doctor_emp_id) !== String(req.user.emp_id)) return res.status(403).json({ message: "You can only view summaries for your patients." });

    res.json({
      institution: "Maulana Azad National Institute of Technology (MANIT) Bhopal",
      title: "INPATIENT DISCHARGE SUMMARY & CASE CLOSURE",
      admissionNo: admission.admission_id,
      admissionDate: admission.admission_date,
      dischargeDate: admission.discharge_date,
      patientName: admission.patient_id?.name,
      patientId: admission.patient_id?.patient_id,
      roomAllocated: admission.room_id?.room_number,
      roomType: admission.room_id?.room_type,
      attendingDoctor: admission.doctor_emp_id?.name,
      assignedNurse: admission.assigned_nurse?.name || admission.nurse_name || "Assigned Floor Nurse",
      diagnosis: admission.diagnosis,
      dischargeAdvice: admission.notes || "Continue prescribed home medications. Follow up in OPD after 7 days.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
