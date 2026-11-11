import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getMedicines,
  createMedicine,
  getPrescriptions,
  createPrescription,
  updatePrescription,
  dispensePrescription,
  getPharmacies,
} from "../controllers/pharmacyController.js";

const router = express.Router();

router.get(
  "/medicines",
  auth,
  roles("admin", "doctor", "pharmacist"),
  getMedicines,
);
router.post("/medicines", auth, roles("admin", "pharmacist"), createMedicine);
router.get(
  "/prescriptions",
  auth,
  roles(
    "admin",
    "doctor",
    "patient",
    "pharmacist",
  ),
  getPrescriptions,
);
router.post("/prescriptions", auth, roles("doctor"), createPrescription);
router.put("/prescriptions/:id", auth, roles("doctor"), updatePrescription);
router.post(
  "/prescriptions/:id/dispense",
  auth,
  roles("admin", "pharmacist"),
  dispensePrescription,
);
router.get("/pharmacies", auth, roles("admin", "doctor", "pharmacist"), getPharmacies);

export default router;
