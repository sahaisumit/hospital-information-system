import bcrypt from "bcryptjs";
import {
  User,
  Patient,
  Doctor,
  Employee,
  MedicalStaff,
  AdminStaff,
} from "../models/index.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("GET /api/users failed:", error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, doctor_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: "Enter a valid work email" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Temporary passwords must be at least 8 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = role === "doctor"
      ? (doctor_id ? await Doctor.findById(doctor_id) : await Doctor.findOne({ email: normalizedEmail }))
      : null;
    if (role === "doctor" && !doctor) {
      return res.status(400).json({ message: "Select an existing doctor staff profile before issuing login credentials" });
    }
    if (role === "doctor" && await User.findOne({ role: "doctor", emp_id: doctor._id })) {
      return res.status(409).json({ message: "This doctor already has a login account" });
    }
    if (role === "doctor" && doctor.email !== normalizedEmail) {
      doctor.email = normalizedEmail;
      await doctor.save();
    }
    const user = await User.create({
      name: name || doctor?.name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phone,
      ...(doctor ? { emp_id: doctor._id } : {}),
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json(safeUser);
  } catch (error) {
    console.error("POST /api/users failed:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, phone, active } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (active === false && req.user.id === id) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    const normalizedEmail = email === undefined ? user.email : String(email).trim().toLowerCase();
    if (email && normalizedEmail !== user.email) {
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "User with this email already exists",
        });
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = normalizedEmail;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (active !== undefined) user.active = active;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const nextRole = role === undefined ? user.role : role;
    if (nextRole === "doctor") {
      const doctor = await Doctor.findOne({ email: normalizedEmail });
      if (!doctor) {
        return res.status(400).json({ message: "A doctor staff profile with this work email is required" });
      }
      user.emp_id = doctor._id;
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json(safeUser);
  } catch (error) {
    console.error("PUT /api/users/:id failed:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    console.error("PATCH /api/users/:id/deactivate failed:", error);

    res.status(400).json({
      message: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let roleDetails = null;

    if (user.role === "patient") {
      let patient = null;
      if (user.patient_id) {
        patient = await Patient.findById(user.patient_id);
      }
      if (!patient) {
        patient = await Patient.findOne({
          $or: [{ email: user.email }, { user_id: user._id }],
        });
      }
      if (!patient) {
        const count = await Patient.countDocuments();
        const patient_id = `PAT-${String(count + 1001).padStart(4, "0")}`;
        patient = await Patient.create({
          patient_id,
          patientId: patient_id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          gender: "Other",
          dob: new Date("2000-01-01"),
          user_id: user._id,
        });
        user.patient_id = patient._id;
        await user.save();
      }
      roleDetails = patient;
    } else if (user.role === "doctor") {
      let doctor = null;
      if (user.emp_id) {
        doctor = await Doctor.findById(user.emp_id);
      }
      if (!doctor) {
        doctor = await Doctor.findOne({ email: user.email });
      }
      if (!doctor) {
        doctor = await Doctor.findOne({
          name: { $regex: new RegExp(user.name.replace(/^Dr\.\s*/i, ""), "i") },
        });
      }
      roleDetails = doctor;
    } else if (["nurse", "pharmacist", "lab"].includes(user.role)) {
      const staffType =
        user.role === "nurse"
          ? "Nurse"
          : user.role === "pharmacist"
            ? "Pharmacist"
            : "Lab Technician";
      const staff = await MedicalStaff.findOne({
        $or: [
          { name: { $regex: new RegExp(user.name, "i") } },
          { staff_type: staffType },
        ],
      });
      roleDetails = staff;
    } else if (["receptionist", "accountant", "admin"].includes(user.role)) {
      const adminRole =
        user.role === "receptionist"
          ? "Receptionist"
          : user.role === "accountant"
            ? "Billing"
            : "Executive";
      const adminStaff = await AdminStaff.findOne({
        $or: [{ email: user.email }, { admin_role: adminRole }],
      });
      roleDetails = adminStaff;
    }

    res.json({
      user,
      role: user.role,
      roleDetails: roleDetails || {},
      is_available: user.is_available ?? true,
      status_note: user.status_note || "Available",
    });
  } catch (error) {
    console.error("GET /api/users/profile failed:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      phone,
      password,
      is_available,
      status_note,
      // Patient specific fields
      dob,
      gender,
      blood_group,
      bloodGroup,
      address,
      emergency_contact,
      emergencyContact,
      allergies,
      // Doctor specific fields
      specialization,
      department,
      consultation_fee,
      consultationFee,
      availableDays,
      license_no,
      // Staff specific fields
      staff_type,
    } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (is_available !== undefined) user.is_available = Boolean(is_available);
    if (status_note !== undefined) user.status_note = status_note.trim();

    if (password && password.length >= 6) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    let updatedRoleDetails = null;

    if (user.role === "patient") {
      let patient = null;
      if (user.patient_id) patient = await Patient.findById(user.patient_id);
      if (!patient)
        patient = await Patient.findOne({
          $or: [{ email: user.email }, { user_id: user._id }],
        });

      if (patient) {
        if (name) patient.name = name.trim();
        if (phone !== undefined) patient.phone = phone.trim();
        if (dob) patient.dob = new Date(dob);
        if (gender) patient.gender = gender;
        const bg = blood_group || bloodGroup;
        if (bg) {
          patient.blood_group = bg;
          patient.bloodGroup = bg;
        }
        if (address !== undefined) patient.address = address;
        const ec = emergency_contact || emergencyContact;
        if (ec !== undefined) {
          patient.emergency_contact = ec;
          patient.emergencyContact = ec;
        }
        if (allergies !== undefined) patient.allergies = allergies;
        await patient.save();
        updatedRoleDetails = patient;
      }
    } else if (user.role === "doctor") {
      let doctor = null;
      if (user.emp_id) doctor = await Doctor.findById(user.emp_id);
      if (!doctor) doctor = await Doctor.findOne({ email: user.email });

      if (doctor) {
        if (name) doctor.name = name.trim();
        if (phone !== undefined) doctor.phone = phone.trim();
        if (specialization) doctor.specialization = specialization;
        if (department) doctor.department = department;
        const fee = consultation_fee ?? consultationFee;
        if (fee !== undefined) {
          doctor.consultation_fee = Number(fee);
          doctor.consultationFee = Number(fee);
        }
        if (availableDays) doctor.availableDays = availableDays;
        if (license_no !== undefined) doctor.license_no = license_no;
        if (is_available !== undefined)
          doctor.is_available = Boolean(is_available);
        if (status_note !== undefined) doctor.status_note = status_note.trim();
        await doctor.save();
        updatedRoleDetails = doctor;
      }
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      user: safeUser,
      role: user.role,
      roleDetails: updatedRoleDetails,
      is_available: user.is_available,
      status_note: user.status_note,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/users/profile failed:", error);
    res.status(400).json({ message: error.message });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const { is_available, status_note } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (is_available !== undefined) user.is_available = Boolean(is_available);
    if (status_note !== undefined) user.status_note = status_note;

    await user.save();

    // If user is a doctor, synchronize Doctor document
    if (user.role === "doctor") {
      await Doctor.updateMany(
        {
          $or: [
            { _id: user.emp_id },
            { email: user.email },
            { name: user.name },
          ],
        },
        {
          $set: {
            is_available: user.is_available,
            status_note: user.status_note,
          },
        },
      );
    }

    res.json({
      is_available: user.is_available,
      status_note: user.status_note,
      message: `Status updated to ${user.is_available ? "Available" : "Not Available"}`,
    });
  } catch (error) {
    console.error("PATCH /api/users/availability failed:", error);
    res.status(400).json({ message: error.message });
  }
};
