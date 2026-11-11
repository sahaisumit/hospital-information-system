import mongoose from "mongoose";
import {
  Patient,
  Doctor,
  Appointment,
  Prescription,
  LabTest,
  TestCharge,
  Bed,
  Bill,
  NurseAssignment,
  Admission,
  MedicalStaff,
} from "../models/index.js";

import { auth, permission } from "../middleware/auth.js";
import { permissions } from "../config/permissions.js";

export const crud = (router, path, Model, populateFields = []) => {
  const resourcePermissions = permissions[path];

  // =========================
  // GET ALL
  // =========================
  router.get(
    `/${path}`,
    auth,
    permission(resourcePermissions.read),
    async (req, res) => {
      try {
        let query = Model.find();

        // Scope data for patient role so patients only see their records
        if (
          req.user?.role === "patient" &&
          ["appointments", "prescriptions", "lab-tests", "bills"].includes(path)
        ) {
          let patientId = req.user.patient_id;
          if (!patientId) {
            const p = await Patient.findOne({
              $or: [{ user_id: req.user.id }, { email: req.user.email }],
            });
            if (p) patientId = p._id;
          }
          if (patientId) {
            query = query.where({
              $or: [{ patient: patientId }, { patient_id: patientId }],
            });
          } else {
            return res.json([]);
          }
        }

        if (
          req.user?.role === "doctor" &&
          ["appointments", "prescriptions", "lab-tests"].includes(path)
        ) {
          if (!req.user.emp_id) return res.json([]);
          query = query.where({
            $or: [
              { doctor: req.user.emp_id },
              { doctor_emp_id: req.user.emp_id },
            ],
          });
        }

        if (path === "beds" && req.user?.role === "nurse") {
          const staff = await MedicalStaff.findOne({ emp_id: req.user.emp_id }).select("_id");
          const nurseId = staff?._id || req.user.emp_id;
          const assignmentIds = await NurseAssignment.find({ nurse_emp_id: nurseId, active: true }).distinct("admission_id");
          const patientIds = await Admission.find({ _id: { $in: assignmentIds }, status: "admitted" }).distinct("patient_id");
          query = query.where({ patient: { $in: patientIds } });
        }

        // Populate only fields that actually exist
        if (
          ["appointments", "prescriptions", "lab-tests", "bills"].includes(path)
        ) {
          query = query.populate("patient");
        }

        if (["appointments", "prescriptions"].includes(path)) {
          query = query.populate("doctor");
        }

        const data = await query.sort({ createdAt: -1 });
        if (path === "lab-tests") {
          const charges = data.length
            ? await TestCharge.find({ test_id: { $in: data.map((test) => test._id) } }).populate("bill_id", "status")
            : [];
          const paidTestIds = new Set(charges.filter((charge) => charge.bill_id?.status === "paid").map((charge) => String(charge.test_id)));
          return res.json(data.map((test) => {
            const item = test.toObject();
            delete item.report_file_data;
            item.report_paid = paidTestIds.has(String(test._id));
            if (req.user?.role === "doctor" && !item.report_paid) {
              item.result = undefined;
              item.notes = undefined;
              item.report_file_name = undefined;
              item.report_file_type = undefined;
              item.completedAt = undefined;
            }
            return item;
          }));
        }

        res.json(data);
      } catch (e) {
        console.error(`GET /api/${path}:`, e);

        res.status(500).json({
          message: e.message,
        });
      }
    },
  );

  // =========================
  // CREATE
  // =========================
  router.post(
    `/${path}`,
    auth,
    permission(resourcePermissions.create),
    async (req, res) => {
      try {
        if (path === "lab-tests") {
          return res.status(403).json({ message: "Use the laboratory workflow to create lab tests" });
        }
        const body = { ...req.body };

        // Convert patient name/patientId into ObjectId
        if (
          [
            "appointments",
            "prescriptions",
            "lab-tests",
            "beds",
            "bills",
          ].includes(path) &&
          body.patient &&
          !mongoose.Types.ObjectId.isValid(body.patient)
        ) {
          const patient = await Patient.findOne({
            $or: [
              { patientId: body.patient },
              {
                name: {
                  $regex: `^${body.patient.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                  )}$`,
                  $options: "i",
                },
              },
            ],
          });

          if (!patient) {
            return res.status(400).json({
              message: `Patient "${body.patient}" was not found`,
            });
          }

          body.patient = patient._id;
        }

        // Convert doctor name into ObjectId
        if (
          ["appointments", "prescriptions"].includes(path) &&
          body.doctor &&
          !mongoose.Types.ObjectId.isValid(body.doctor)
        ) {
          const doctor = await Doctor.findOne({
            name: {
              $regex: `^${body.doctor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
          });

          if (!doctor) {
            return res.status(400).json({
              message: `Doctor "${body.doctor}" was not found`,
            });
          }

          body.doctor = doctor._id;
        }

        const doc = await Model.create(body);

        res.status(201).json(doc);
      } catch (e) {
        console.error(`POST /api/${path} failed:`, e);
        res.status(400).json({ message: e.message });
      }
    },
  );

  // =========================
  // GET ONE
  // =========================
  router.get(
    `/${path}/:id`,
    auth,
    permission(resourcePermissions.read),
    async (req, res) => {
      try {
        let query = Model.findById(req.params.id);

        if (
          ["appointments", "prescriptions", "lab-tests", "bills"].includes(path)
        ) {
          query = query.populate("patient");
        }

        if (["appointments", "prescriptions"].includes(path)) {
          query = query.populate("doctor");
        }

        const d = await query;

        if (!d) {
          return res.status(404).json({
            message: "Record not found",
          });
        }

        if (path === "beds" && req.user?.role === "nurse") {
          const staff = await MedicalStaff.findOne({ emp_id: req.user.emp_id }).select("_id");
          const nurseId = staff?._id || req.user.emp_id;
          const assignmentIds = await NurseAssignment.find({ nurse_emp_id: nurseId, active: true }).distinct("admission_id");
          const assigned = await Admission.exists({ _id: { $in: assignmentIds }, patient_id: d.patient, status: "admitted" });
          if (!assigned) return res.status(403).json({ message: "You can only view rooms for patients assigned to your nursing account." });
        }

        if (
          req.user?.role === "doctor" &&
          ["appointments", "prescriptions", "lab-tests"].includes(path)
        ) {
          const ownerDoctor = d.doctor_emp_id || d.doctor;
          if (String(ownerDoctor) !== String(req.user.emp_id)) {
            return res
              .status(403)
              .json({
                message: "You can only view records for your own patients",
              });
          }
        }
        if (
          req.user?.role === "patient" &&
          ["appointments", "prescriptions", "lab-tests", "bills"].includes(path)
        ) {
          const ownPatient = d.patient_id || d.patient;
          if (String(ownPatient) !== String(req.user.patient_id)) {
            return res
              .status(403)
              .json({ message: "You can only view your own records" });
          }
        }

        if (path === "lab-tests") {
          const item = d.toObject();
          delete item.report_file_data;
          if (req.user?.role === "doctor") {
            const charge = await TestCharge.findOne({ test_id: item._id }).populate("bill_id", "status");
            if (charge?.bill_id?.status !== "paid") {
              item.result = undefined;
              item.notes = undefined;
              item.report_file_name = undefined;
              item.report_file_type = undefined;
              item.completedAt = undefined;
            }
            item.report_paid = charge?.bill_id?.status === "paid";
          }
          return res.json(item);
        }

        res.json(d);
      } catch (e) {
        res.status(500).json({
          message: e.message,
        });
      }
    },
  );

  // =========================
  // UPDATE
  // =========================
  router.put(
    `/${path}/:id`,
    auth,
    permission(resourcePermissions.update),
    async (req, res) => {
      try {
        if (path === "lab-tests") {
          return res.status(403).json({ message: "Use the laboratory workflow to submit lab reports" });
        }
        const updates = { ...req.body };
        if (path === "patients" && req.user?.role === "nurse") {
          const staff = await MedicalStaff.findOne({ emp_id: req.user.emp_id }).select("_id");
          const nurseId = staff?._id || req.user.emp_id;
          const assignments = await NurseAssignment.find({ nurse_emp_id: nurseId, active: true }).distinct("admission_id");
          const assigned = await Admission.exists({ _id: { $in: assignments }, patient_id: req.params.id, status: "admitted" });
          if (!assigned) return res.status(403).json({ message: "You can only update patients assigned to your nursing account." });
        }
        if (path === "appointments") {
          delete updates.payment_status;
          delete updates.payment_method;
          delete updates.payment_reference;
          delete updates.consultation_fee;
        }
        const doc = await Model.findByIdAndUpdate(req.params.id, updates, {
          new: true,
          runValidators: true,
        });

        if (!doc) {
          return res.status(404).json({
            message: "Not found",
          });
        }

        res.json(doc);
      } catch (e) {
        console.error(`PUT /api/${path}/${req.params.id} failed:`, e);
        res.status(400).json({
          message: e.message,
        });
      }
    },
  );

  // ==========================================
  // DELETE ONE RECORD
  // ==========================================
  router.delete(
    `/${path}/:id`,
    auth,
    permission(resourcePermissions.delete),
    async (req, res) => {
      try {
        const id = req.params.id;

        // Check whether ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            message: "Invalid record ID",
          });
        }

        // Check whether record exists
        const record = await Model.findById(id);

        if (!record) {
          return res.status(404).json({
            message: "Record not found",
          });
        }

        // ==========================================
        // PATIENT DELETE PROTECTION
        // ==========================================
        if (path === "patients") {
          const [appointments, prescriptions, labTests, bills, beds] =
            await Promise.all([
              Appointment.countDocuments({ patient: id }),
              Prescription.countDocuments({ patient: id }),
              LabTest.countDocuments({ patient: id }),
              Bill.countDocuments({ patient: id }),
              Bed.countDocuments({ patient: id }),
            ]);

          const dependencies = [];

          if (appointments > 0) {
            dependencies.push(`${appointments} appointment(s)`);
          }

          if (prescriptions > 0) {
            dependencies.push(`${prescriptions} prescription(s)`);
          }

          if (labTests > 0) {
            dependencies.push(`${labTests} lab test(s)`);
          }

          if (bills > 0) {
            dependencies.push(`${bills} bill(s)`);
          }

          if (beds > 0) {
            dependencies.push(`${beds} bed assignment(s)`);
          }

          if (dependencies.length > 0) {
            return res.status(409).json({
              message:
                `Cannot delete this patient because related records exist: ` +
                dependencies.join(", ") +
                ". Please remove or resolve these records first.",
            });
          }
        }

        // ==========================================
        // DOCTOR DELETE PROTECTION
        // ==========================================
        if (path === "doctors") {
          const [appointments, prescriptions] = await Promise.all([
            Appointment.countDocuments({ doctor: id }),
            Prescription.countDocuments({ doctor: id }),
          ]);

          const dependencies = [];

          if (appointments > 0) {
            dependencies.push(`${appointments} appointment(s)`);
          }

          if (prescriptions > 0) {
            dependencies.push(`${prescriptions} prescription(s)`);
          }

          if (dependencies.length > 0) {
            return res.status(409).json({
              message:
                `Cannot delete this doctor because related records exist: ` +
                dependencies.join(", ") +
                ". Please remove or resolve these records first.",
            });
          }
        }

        // ==========================================
        // BED DELETE PROTECTION
        // ==========================================
        if (path === "beds") {
          if (record.status === "occupied" || record.patient) {
            return res.status(409).json({
              message:
                "Cannot delete this bed because it is currently occupied or assigned to a patient. Discharge the patient and make the bed available first.",
            });
          }
        }

        // ==========================================
        // BILL DELETE PROTECTION
        // ==========================================
        if (path === "bills") {
          if (record.status === "paid") {
            return res.status(409).json({
              message:
                "Cannot delete a paid bill. Paid bills are financial records and must be retained.",
            });
          }

          if (record.status === "partial") {
            return res.status(409).json({
              message:
                "Cannot delete a partially paid bill. Please resolve the outstanding payment first.",
            });
          }
        }

        // ==========================================
        // DELETE RECORD
        // ==========================================
        await Model.findByIdAndDelete(id);

        res.json({
          message: "Record deleted successfully",
        });
      } catch (e) {
        console.error(`DELETE /api/${path}/${req.params.id}:`, e);

        res.status(500).json({
          message: e.message,
        });
      }
    },
  );

  // =========================
  // DELETE MULTIPLE RECORDS
  // =========================
  router.post(
    `/${path}/bulk-delete`,
    auth,
    permission(resourcePermissions.delete),
    async (req, res) => {
      try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            message: "No records selected.",
          });
        }

        // Validate all IDs
        const invalidIds = ids.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id),
        );

        if (invalidIds.length > 0) {
          return res.status(400).json({
            message: "One or more selected IDs are invalid.",
          });
        }

        // Make IDs unique
        const uniqueIds = [...new Set(ids)];

        // Make sure all records actually exist
        const records = await Model.find({
          _id: { $in: uniqueIds },
        });

        if (records.length !== uniqueIds.length) {
          return res.status(404).json({
            message: "One or more selected records were not found.",
          });
        }

        // ==========================================
        // PATIENT DELETE PROTECTION
        // ==========================================
        if (path === "patients") {
          const [appointments, prescriptions, labTests, bills, beds] =
            await Promise.all([
              Appointment.countDocuments({
                patient: { $in: uniqueIds },
              }),

              Prescription.countDocuments({
                patient: { $in: uniqueIds },
              }),

              LabTest.countDocuments({
                patient: { $in: uniqueIds },
              }),

              Bill.countDocuments({
                patient: { $in: uniqueIds },
              }),

              Bed.countDocuments({
                patient: { $in: uniqueIds },
              }),
            ]);

          const dependencies = [];

          if (appointments > 0) {
            dependencies.push(`${appointments} appointment(s)`);
          }

          if (prescriptions > 0) {
            dependencies.push(`${prescriptions} prescription(s)`);
          }

          if (labTests > 0) {
            dependencies.push(`${labTests} lab test(s)`);
          }

          if (bills > 0) {
            dependencies.push(`${bills} bill(s)`);
          }

          if (beds > 0) {
            dependencies.push(`${beds} bed assignment(s)`);
          }

          if (dependencies.length > 0) {
            return res.status(409).json({
              message:
                `Cannot delete the selected patient records because related records exist: ` +
                dependencies.join(", ") +
                `. No records were deleted.`,
            });
          }
        }

        // ==========================================
        // DOCTOR DELETE PROTECTION
        // ==========================================
        if (path === "doctors") {
          const [appointments, prescriptions] = await Promise.all([
            Appointment.countDocuments({
              doctor: { $in: uniqueIds },
            }),

            Prescription.countDocuments({
              doctor: { $in: uniqueIds },
            }),
          ]);

          const dependencies = [];

          if (appointments > 0) {
            dependencies.push(`${appointments} appointment(s)`);
          }

          if (prescriptions > 0) {
            dependencies.push(`${prescriptions} prescription(s)`);
          }

          if (dependencies.length > 0) {
            return res.status(409).json({
              message:
                `Cannot delete the selected doctor records because related records exist: ` +
                dependencies.join(", ") +
                `. No records were deleted.`,
            });
          }
        }

        // ==========================================
        // BED DELETE PROTECTION
        // ==========================================
        if (path === "beds") {
          const blockedBeds = records.filter(
            (bed) => bed.status === "occupied" || bed.patient,
          );

          if (blockedBeds.length > 0) {
            return res.status(409).json({
              message:
                `${blockedBeds.length} selected bed(s) cannot be deleted because they are occupied or assigned to a patient. ` +
                `Discharge the patient and make the bed available first. No records were deleted.`,
            });
          }
        }

        // ==========================================
        // BILL DELETE PROTECTION
        // ==========================================
        if (path === "bills") {
          const blockedBills = records.filter(
            (bill) => bill.status === "paid" || bill.status === "partial",
          );

          if (blockedBills.length > 0) {
            return res.status(409).json({
              message:
                `${blockedBills.length} selected bill(s) cannot be deleted because they are paid or partially paid. ` +
                `Only pending bills can be deleted. No records were deleted.`,
            });
          }
        }

        // ==========================================
        // DELETE ALL SELECTED RECORDS
        // ==========================================
        await Model.deleteMany({
          _id: { $in: uniqueIds },
        });

        res.json({
          message: `${uniqueIds.length} record(s) deleted successfully.`,
        });
      } catch (e) {
        console.error(`POST /api/${path}/bulk-delete:`, e);

        res.status(500).json({
          message: e.message,
        });
      }
    },
  );
};
