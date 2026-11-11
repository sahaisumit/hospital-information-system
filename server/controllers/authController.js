import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Patient, Doctor } from "../models/index.js";

export const register = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Authentication is not configured on the server" });
    }
    const {
      name,
      email,
      password,
      role = "patient",
      phone,
      dob,
      gender,
      blood_group,
      address,
      emergency_contact,
      allergies,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }
    if (name.trim().length > 100)
      return res
        .status(400)
        .json({ message: "Name must be 100 characters or fewer" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ message: "Enter a valid email address" });
    if (phone && !/^\d{10}$/.test(phone))
      return res
        .status(400)
        .json({ message: "Phone number must contain exactly 10 digits" });
    if (emergency_contact && !/^\d{10}$/.test(emergency_contact))
      return res
        .status(400)
        .json({ message: "Emergency contact must contain exactly 10 digits" });

    // Public sign-up creates patient accounts only. Staff accounts are provisioned
    // by an administrator so a registrant cannot grant themselves clinical access.
    if (role && role !== "patient") {
      return res
        .status(403)
        .json({
          message: "Staff accounts must be created by a hospital administrator",
        });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }
    if (dob) {
      const parsedDob = new Date(`${dob}T00:00:00.000Z`);
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
        Number.isNaN(parsedDob.getTime()) ||
        parsedDob.toISOString().slice(0, 10) !== dob ||
        dob > todayString
      ) {
        return res
          .status(400)
          .json({
            message:
              "Date of birth must be a valid date that is not in the future",
          });
      }
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = "patient";

    let patientRecord = null;

    if (assignedRole === "patient") {
      const patientCount = await Patient.countDocuments();
      const patient_id = `PAT-${String(patientCount + 1001).padStart(4, "0")}`;

      patientRecord = await Patient.create({
        patient_id,
        patientId: patient_id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || "",
        gender: gender || "Other",
        dob: dob ? new Date(dob) : new Date("2000-01-01"),
        blood_group: blood_group || "O+",
        bloodGroup: blood_group || "O+",
        address: address || "",
        emergency_contact: emergency_contact || "",
        emergencyContact: emergency_contact || "",
        allergies: allergies || "None known",
        status: "OPD",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      phone: phone || "",
      patient_id: patientRecord?._id,
      is_available: true,
      status_note: "Available",
      active: true,
    });

    if (patientRecord) {
      patientRecord.user_id = user._id;
      await patientRecord.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        patient_id: user.patient_id,
        emp_id: user.emp_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        patient_id: user.patient_id,
        emp_id: user.emp_id,
        is_available: user.is_available,
        status_note: user.status_note,
        patientCode: patientRecord.patient_id,
      },
      message: "Registration successful!",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Authentication is not configured on the server" });
    }
    const email =
      typeof req.body.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";
    if (!email || typeof req.body.password !== "string" || !req.body.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const u = await User.findOne({ email });

    if (!u || !(await bcrypt.compare(req.body.password, u.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!u.active) {
      return res.status(403).json({
        message: "Account is inactive",
      });
    }

    // Auto-link Patient or Doctor if missing
    if (u.role === "patient" && !u.patient_id) {
      let patient = await Patient.findOne({
        $or: [{ email: u.email }, { user_id: u._id }],
      });
      if (!patient) {
        const count = await Patient.countDocuments();
        const patient_id = `PAT-${String(count + 1001).padStart(4, "0")}`;
        patient = await Patient.create({
          patient_id,
          patientId: patient_id,
          name: u.name,
          email: u.email,
          phone: u.phone || "",
          gender: "Other",
          dob: new Date("2000-01-01"),
          user_id: u._id,
        });
      }
      u.patient_id = patient._id;
      await u.save();
    } else if (u.role === "doctor" && !u.emp_id) {
      // Repair older accounts only from a matching doctor email or exact name;
      // never attach a login to an arbitrary doctor's schedule.
      const doc = await Doctor.findOne({
        $or: [{ email: u.email }, { name: u.name }],
      });
      if (doc) {
        u.emp_id = doc._id;
        await u.save();
      }
    }

    const token = jwt.sign(
      {
        id: u._id,
        role: u.role,
        name: u.name,
        email: u.email,
        patient_id: u.patient_id,
        emp_id: u.emp_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      user: {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        patient_id: u.patient_id,
        emp_id: u.emp_id,
        is_available: u.is_available ?? true,
        status_note: u.status_note || "Available",
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
