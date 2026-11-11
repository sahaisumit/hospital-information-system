import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getPatients,
  createPatient,
  getPatientById,
  addMedicalHistory,
  getPatientReport,
} from "../controllers/patientController.js";

const router = express.Router();

router.get("/", auth, roles("admin", "doctor", "nurse", "receptionist"), getPatients);
router.post("/", auth, roles("admin", "receptionist"), createPatient);
router.get("/:id", auth, roles("admin", "doctor", "nurse", "receptionist"), getPatientById);
router.post("/:id/medical-history", auth, roles("admin", "doctor", "nurse"), addMedicalHistory);
router.get("/:id/report", auth, roles("admin", "doctor", "nurse"), getPatientReport);

export default router;
