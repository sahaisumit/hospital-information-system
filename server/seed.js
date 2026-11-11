import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Doctor, Medicine, Bed } from "./models/index.js";
dotenv.config();
await mongoose.connect(
  process.env.MONGO_URI
);
console.log("Connected to MongoDB database:", mongoose.connection.name);
await User.updateOne(
  { email: "admin@his.local" },
  {
    $set: {
      name: "System Administrator",
      password: await bcrypt.hash("Admin@123", 10),
      role: "admin",
      is_available: true,
    },
  },
  { upsert: true },
);
await User.updateOne(
  { email: "patient@his.local" },
  {
    $set: {
      name: "Aarav Sharma (Patient)",
      password: await bcrypt.hash("Demo@123", 10),
      role: "patient",
      is_available: true,
      status_note: "Available",
    },
  },
  { upsert: true },
);
if ((await Doctor.countDocuments()) === 0)
  await Doctor.insertMany([
    {
      name: "Dr. Ananya Sharma",
      specialization: "Cardiology",
      department: "Cardiology",
      consultation_fee: 800,
      consultationFee: 800,
    },
    {
      name: "Dr. Rahul Verma",
      specialization: "General Medicine",
      department: "Medicine",
      consultation_fee: 500,
      consultationFee: 500,
    },
  ]);
const demoStaffPassword = await bcrypt.hash("Demo@123", 10);
for (const account of [
  { name: "Dr. Ananya Sharma", email: "doctor@his.local", role: "doctor", phone: "9000000002" },
  { name: "Nurse Coordinator", email: "nurse@his.local", role: "nurse", phone: "9000000003" },
  { name: "Front Desk Receptionist", email: "reception@his.local", role: "receptionist", phone: "9000000004" },
  { name: "Pharmacy Manager", email: "pharmacy@his.local", role: "pharmacist", phone: "9000000005" },
  { name: "Laboratory Technician", email: "lab@his.local", role: "lab", phone: "9000000006" },
  { name: "Accounts Manager", email: "accounts@his.local", role: "accountant", phone: "9000000007" },
]) {
  const update = {
    name: account.name,
    password: demoStaffPassword,
    role: account.role,
    phone: account.phone,
    active: true,
  };
  if (account.role === "doctor") {
    const doctor = await Doctor.findOne({ email: account.email }) || await Doctor.findOne().sort({ createdAt: 1 });
    if (doctor) update.emp_id = doctor._id;
  }
  await User.updateOne({ email: account.email }, { $set: update }, { upsert: true });
}
// Dedicated doctor 15 demo login. Keep it linked to the matching schedule profile.
let doctor15 = await Doctor.findOne({ email: "doctor15@his.local" });
if (!doctor15) {
  doctor15 = await Doctor.create({
    name: "Dr. Doctor 15",
    email: "doctor15@his.local",
    specialization: "General Medicine",
    department: "Medicine",
    consultation_fee: 500,
    consultationFee: 500,
  });
}
await User.updateOne(
  { email: "doctor15@his.local" },
  {
    $set: {
      name: doctor15.name,
      password: await bcrypt.hash("Admin@123", 10),
      role: "doctor",
      emp_id: doctor15._id,
      active: true,
    },
  },
  { upsert: true },
);
if ((await Medicine.countDocuments()) === 0)
  await Medicine.insertMany([
    {
      name: "Paracetamol 500mg",
      category: "Analgesic",
      quantity: 120,
      reorderLevel: 30,
      unitPrice: 2,
    },
    {
      name: "Amoxicillin 500mg",
      category: "Antibiotic",
      quantity: 12,
      reorderLevel: 20,
      unitPrice: 8,
    },
  ]);
if ((await Bed.countDocuments()) === 0)
  await Bed.insertMany([
    { ward: "General", bedNumber: "G-101", type: "General" },
    { ward: "General", bedNumber: "G-102", type: "General" },
    { ward: "ICU", bedNumber: "I-01", type: "ICU", status: "occupied" },
  ]);
console.log("Seed complete");
await mongoose.disconnect();
