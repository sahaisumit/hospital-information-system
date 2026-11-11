import mongoose from "mongoose";
import {
  Patient,
  MedicalHistory,
  Appointment,
  Prescription,
  Admission,
  Bill,
  NurseAssignment,
  MedicalStaff,
} from "../models/index.js";

const nurseRecordId = async (user) => {
  if (!user?.emp_id) return null;
  const staff = await MedicalStaff.findOne({ emp_id: user.emp_id }).select("_id");
  return staff?._id || user.emp_id;
};

export const getPatients = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { patient_id: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (req.user?.role === "nurse") {
      const assignmentIds = await NurseAssignment.find({ nurse_emp_id: await nurseRecordId(req.user), active: true }).distinct("admission_id");
      const assignedPatientIds = await Admission.find({ _id: { $in: assignmentIds }, status: "admitted" }).distinct("patient_id");
      query._id = { $in: assignedPatientIds };
    }

    const patients = await Patient.find(query)
      .populate("active_admission_id")
      .sort({ createdAt: -1 });

    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createPatient = async (req, res) => {
  try {
    const count = await Patient.countDocuments();
    const patient_id =
      req.body.patient_id || `PAT-${String(count + 1001).padStart(4, "0")}`;

    const newPatient = await Patient.create({
      ...req.body,
      patient_id,
      patientId: patient_id,
      status: req.body.status || "OPD",
    });

    // If initial history was provided, log it into MedicalHistory
    if (req.body.history || req.body.condition_md) {
      const histCount = await MedicalHistory.countDocuments();
      await MedicalHistory.create({
        history_id: `HIST-${String(histCount + 1001).padStart(4, "0")}`,
        patient_id: newPatient._id,
        condition_md:
          req.body.condition_md ||
          req.body.history ||
          "Initial registration notes",
        diagnosis_date: new Date(),
        notes: req.body.notes || "Recorded upon registration",
      });
    }

    res.status(201).json(newPatient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user?.role === "nurse") {
      const assignedAdmission = await Admission.findOne({ patient_id: patient._id, status: "admitted", assigned_nurse: await nurseRecordId(req.user) });
      if (!assignedAdmission) return res.status(403).json({ message: "You can only access patients assigned to your nursing account." });
    }

    // Fetch longitudinal history, appointments, prescriptions, admissions, bills
    const [history, appointments, prescriptions, admissions, bills] =
      await Promise.all([
        MedicalHistory.find({ patient_id: patient._id }).sort({
          diagnosis_date: -1,
        }),
        Appointment.find({ patient_id: patient._id })
          .populate("doctor_emp_id")
          .sort({ appointment_date: -1 }),
        Prescription.find({ patient_id: patient._id })
          .populate("doctor_emp_id")
          .sort({ prescription_date: -1 }),
        Admission.find({ patient_id: patient._id })
          .populate("room_id doctor_emp_id assigned_nurse")
          .sort({ admission_date: -1 }),
        Bill.find({ patient_id: patient._id }).sort({ bill_date: -1 }),
      ]);

    res.json({
      patient,
      history,
      appointments,
      prescriptions,
      admissions,
      bills,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addMedicalHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user?.role === "nurse" && !(await Admission.findOne({ patient_id: patient._id, status: "admitted", assigned_nurse: await nurseRecordId(req.user) }))) return res.status(403).json({ message: "You can only access patients assigned to your nursing account." });

    const count = await MedicalHistory.countDocuments();
    const record = await MedicalHistory.create({
      history_id: `HIST-${String(count + 1001).padStart(4, "0")}`,
      patient_id: patient._id,
      condition_md: req.body.condition_md,
      diagnosis_date: req.body.diagnosis_date || new Date(),
      doctor_emp_id: req.body.doctor_emp_id,
      notes: req.body.notes,
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DFD 2.7: Generate Comprehensive Patient Report (Case Sheet)
export const getPatientReport = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (req.user?.role === "nurse" && !(await Admission.findOne({ patient_id: patient._id, status: "admitted", assigned_nurse: await nurseRecordId(req.user) }))) return res.status(403).json({ message: "You can only access patients assigned to your nursing account." });

    const [history, appointments, prescriptions, admissions, bills] =
      await Promise.all([
        MedicalHistory.find({ patient_id: patient._id }),
        Appointment.find({ patient_id: patient._id }).populate("doctor_emp_id"),
        Prescription.find({ patient_id: patient._id }).populate(
          "doctor_emp_id",
        ),
        Admission.find({ patient_id: patient._id }).populate(
          "room_id doctor_emp_id assigned_nurse",
        ),
        Bill.find({ patient_id: patient._id }),
      ]);

    res.json({
      reportTitle: "HOSPITAL INFORMATION SYSTEM - PATIENT CLINICAL SUMMARY",
      institution:
        "Maulana Azad National Institute of Technology (MANIT) Bhopal",
      generatedAt: new Date(),
      patient,
      clinicalData: {
        history,
        appointments,
        prescriptions,
        admissions,
        financialStatus: {
          totalBilled: bills.reduce((acc, b) => acc + (b.total_amount || 0), 0),
          pendingBills: bills.filter((b) => b.status === "pending").length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
