import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Employee,
  Doctor,
  MedicalStaff,
  AdminStaff,
  Department,
  Hospital,
  NurseAssignment,
} from "../models/index.js";
import { TriggerEngine } from "../services/triggerEngine.js";

export const getEmployees = async (req, res) => {
  try {
    const list = await Employee.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { role_name, department_name, hire_date, email, login_password } = req.body;
    const roleKey = String(role_name || "").trim().toLowerCase();
    const accountRoles = {
      doctor: "doctor",
      nurse: "nurse",
      "lab technician": "lab",
      pharmacist: "pharmacist",
      receptionist: "receptionist",
      accountant: "accountant",
      admin: "admin",
    };
    const accountRole = accountRoles[roleKey];
    if (!accountRole) return res.status(400).json({ message: "Choose a supported staff role" });
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "A valid work email is required to create staff login credentials" });
    }
    if (typeof login_password !== "string" || login_password.length < 8) {
      return res.status(400).json({ message: "Set a temporary login password with at least 8 characters" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: "A login already exists for this email address" });
    }

    // RUN TRIGGER 1: Validate role matches department
    await TriggerEngine.validateRoleDepartment(role_name, department_name);

    // RUN TRIGGER 3: Validate hire date is not in future
    TriggerEngine.validateHireDate(hire_date);

    const count = await Employee.countDocuments();
    const emp_id =
      req.body.emp_id || `EMP-${String(count + 1001).padStart(4, "0")}`;

    const newEmp = await Employee.create({
      ...req.body,
      email: normalizedEmail,
      emp_id,
      hire_date: hire_date || new Date(),
    });

    // RUN TRIGGER 4: Auto insert into Doctor, MedicalStaff, or AdminStaff subclass tables
    await TriggerEngine.distributeEmployeeRole(newEmp, req.body);

    let accountEmpId = newEmp._id;
    if (accountRole === "doctor") {
      const doctor = await Doctor.findOne({ emp_id: newEmp._id });
      accountEmpId = doctor._id;
    }
    await User.create({
      name: newEmp.name,
      email: normalizedEmail,
      password: await bcrypt.hash(login_password, 10),
      role: accountRole,
      phone: newEmp.phone,
      emp_id: accountEmpId,
      active: true,
    });

    res.status(201).json({
      employee: newEmp,
      loginCredentials: { email: normalizedEmail, password: login_password, role: accountRole },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getNursesWithWorkload = async (req, res) => {
  try {
    const nurseFilter = { staff_type: "Nurse" };
    if (req.user?.role === "nurse") nurseFilter.emp_id = req.user.emp_id;
    const nurses = (await MedicalStaff.find(nurseFilter).populate("emp_id"))
      .filter((nurse) => nurse.emp_id?.employment_status === "active");

    const nurseStats = await Promise.all(
      nurses.map(async (nurse) => {
        const activeCount = await NurseAssignment.countDocuments({
          nurse_emp_id: nurse._id,
          active: true,
        });
        return {
          nurse,
          activeAssignments: activeCount,
          workloadStatus:
            activeCount === 0
              ? "Available"
              : activeCount <= 2
                ? "Balanced"
                : "High",
        };
      }),
    );

    res.json(nurseStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const list = await Department.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getHospitals = async (req, res) => {
  try {
    const list = await Hospital.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
