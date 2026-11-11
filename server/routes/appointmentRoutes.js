import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getAppointments,
  createAppointment,
  collectCashPayment,
  getDoctorAvailability,
  getAppointmentSlip,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get(
  "/",
  auth,
  roles("admin", "doctor", "receptionist", "patient"),
  getAppointments,
);
router.post(
  "/",
  auth,
  roles("admin", "receptionist", "patient"),
  createAppointment,
);
router.post(
  "/:id/cash-payment",
  auth,
  roles("admin", "receptionist", "accountant"),
  collectCashPayment,
);
router.get("/doctor/:doctorId/availability", auth, getDoctorAvailability);
router.get(
  "/:id/slip",
  auth,
  roles("admin", "doctor", "receptionist", "patient"),
  getAppointmentSlip,
);

export default router;
