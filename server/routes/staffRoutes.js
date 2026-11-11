import express from "express";
import { auth, roles } from "../middleware/auth.js";
import {
  getEmployees,
  createEmployee,
  getNursesWithWorkload,
  getDepartments,
  getHospitals,
} from "../controllers/staffController.js";

const router = express.Router();

router.get("/employees", auth, roles("admin"), getEmployees);
router.post("/employees", auth, roles("admin"), createEmployee);
router.get("/nurses-workload", auth, roles("admin", "nurse"), getNursesWithWorkload);
router.get("/departments", auth, roles("admin"), getDepartments);
router.get("/hospitals", auth, roles("admin"), getHospitals);

export default router;
