import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getRooms,
  createRoom,
  getAdmissions,
  admitPatient,
  dischargePatient,
  getDischargeSummary,
  forwardPatient,
} from "../controllers/admissionController.js";

const router = express.Router();

router.get("/rooms", auth, roles("admin", "doctor", "nurse"), getRooms);
router.post("/rooms", auth, roles("admin"), createRoom);
router.get("/", auth, roles("admin", "doctor", "nurse"), getAdmissions);
router.post("/admit", auth, roles("admin", "doctor"), admitPatient);
router.post("/forward", auth, roles("doctor"), forwardPatient);
router.post("/:id/discharge", auth, roles("admin", "doctor"), dischargePatient);
router.get("/:id/discharge-summary", auth, roles("admin", "doctor", "nurse"), getDischargeSummary);

export default router;
