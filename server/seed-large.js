import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  User,
  Patient,
  Doctor,
  Appointment,
  Prescription,
  Medicine,
  LabTest,
  Bed,
  Bill,
} from "./models/index.js";

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing from server/.env");
  process.exit(1);
}

let seedValue = 20260908;
const random = () => {
  seedValue = (seedValue * 9301 + 49297) % 233280;
  return seedValue / 233280;
};
const pick = (a) => a[Math.floor(random() * a.length)];
const randInt = (a, b) => Math.floor(random() * (b - a + 1)) + a;

function dateFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, randInt(0, 50), 0, 0);
  return d;
}

const firstNames = [
  "Aarav",
  "Aditi",
  "Aditya",
  "Akash",
  "Ananya",
  "Aniket",
  "Anjali",
  "Arjun",
  "Aryan",
  "Avni",
  "Ayush",
  "Bhavna",
  "Chetan",
  "Deepak",
  "Diya",
  "Esha",
  "Gaurav",
  "Isha",
  "Ishaan",
  "Karan",
  "Kavya",
  "Khushi",
  "Manish",
  "Meera",
  "Mohit",
  "Naina",
  "Naman",
  "Neha",
  "Nikhil",
  "Pallavi",
  "Pankaj",
  "Pooja",
  "Prakash",
  "Priya",
  "Rahul",
  "Riya",
  "Rohan",
  "Rohit",
  "Sakshi",
  "Sameer",
  "Sanjay",
  "Shreya",
  "Simran",
  "Sneha",
  "Sonia",
  "Sourav",
  "Tanvi",
  "Varun",
  "Vikas",
  "Vivek",
];

const lastNames = [
  "Sharma",
  "Verma",
  "Gupta",
  "Singh",
  "Sahai",
  "Patel",
  "Mehta",
  "Kumar",
  "Mishra",
  "Joshi",
  "Malhotra",
  "Agarwal",
  "Srivastava",
  "Chauhan",
  "Reddy",
  "Shah",
  "Yadav",
  "Jain",
  "Sinha",
  "Bansal",
];

const departments = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "General Medicine",
  "General Surgery",
  "Gynecology",
  "ENT",
  "Ophthalmology",
  "Gastroenterology",
  "Pulmonology",
];

const specialization = {
  Cardiology: "Cardiologist",
  Neurology: "Neurologist",
  Orthopedics: "Orthopedic Surgeon",
  Pediatrics: "Pediatrician",
  Dermatology: "Dermatologist",
  "General Medicine": "General Physician",
  "General Surgery": "General Surgeon",
  Gynecology: "Gynecologist",
  ENT: "ENT Specialist",
  Ophthalmology: "Ophthalmologist",
  Gastroenterology: "Gastroenterologist",
  Pulmonology: "Pulmonologist",
};

const reasons = [
  "Routine consultation",
  "Follow-up visit",
  "Chest discomfort",
  "Fever and weakness",
  "Persistent headache",
  "Back pain",
  "Joint pain",
  "Skin irritation",
  "Cough and breathing difficulty",
  "Stomach pain",
  "Eye check-up",
  "Child wellness check",
  "Blood pressure review",
  "Diabetes follow-up",
  "Post-treatment review",
];

const medicineTypes = [
  ["Paracetamol 500mg", "Analgesic", 20, 5, 2.5],
  ["Amoxicillin 500mg", "Antibiotic", 30, 8, 6],
  ["Azithromycin 500mg", "Antibiotic", 25, 7, 9],
  ["Pantoprazole 40mg", "Gastro", 40, 10, 4],
  ["Cetirizine 10mg", "Antiallergic", 50, 10, 1.8],
  ["Metformin 500mg", "Antidiabetic", 60, 15, 2.2],
  ["Amlodipine 5mg", "Cardiac", 55, 12, 2],
  ["Atorvastatin 20mg", "Cardiac", 45, 10, 4.5],
  ["Losartan 50mg", "Cardiac", 50, 10, 3.8],
  ["Ibuprofen 400mg", "Analgesic", 30, 8, 3],
  ["Diclofenac 50mg", "Analgesic", 35, 10, 2.8],
  ["Ondansetron 4mg", "Antiemetic", 25, 6, 5],
  ["Montelukast 10mg", "Respiratory", 45, 10, 5.2],
  ["Salbutamol Inhaler", "Respiratory", 20, 5, 85],
  ["Vitamin D3 60000 IU", "Supplement", 30, 8, 12],
  ["Calcium + Vitamin D", "Supplement", 40, 10, 6],
  ["Iron + Folic Acid", "Supplement", 35, 10, 4],
  ["Clopidogrel 75mg", "Cardiac", 40, 10, 7],
  ["Aspirin 75mg", "Cardiac", 50, 12, 1.5],
  ["Levothyroxine 50mcg", "Endocrine", 60, 15, 1.9],
  ["Glimepiride 2mg", "Antidiabetic", 50, 12, 3],
  ["Furosemide 40mg", "Diuretic", 35, 8, 3],
  ["Mupirocin Ointment", "Dermatology", 20, 5, 55],
  ["Clotrimazole Cream", "Dermatology", 30, 8, 35],
  ["ORS Sachets", "Hydration", 80, 20, 1.5],
];

const tests = [
  "Complete Blood Count",
  "Liver Function Test",
  "Kidney Function Test",
  "Blood Glucose - Fasting",
  "HbA1c",
  "Lipid Profile",
  "Thyroid Profile",
  "Urine Routine",
  "Urine Culture",
  "Chest X-Ray",
  "ECG",
  "Ultrasound Abdomen",
  "CT Scan",
  "MRI Brain",
  "Vitamin D Test",
  "Serum Creatinine",
  "Electrolytes",
  "Blood Group Test",
  "Dengue NS1",
  "Malaria Test",
];

const wards = [
  ["General Ward", "General"],
  ["ICU", "ICU"],
  ["Emergency", "Emergency"],
  ["Pediatrics", "Pediatric"],
  ["Maternity", "Maternity"],
  ["Private Ward", "Private"],
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to:", mongoose.connection.name);

  // Safe to rerun: rebuilds the demo HIS dataset.
  await Promise.all([
    User.deleteMany({}),
    Patient.deleteMany({}),
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    Prescription.deleteMany({}),
    Medicine.deleteMany({}),
    LabTest.deleteMany({}),
    Bed.deleteMany({}),
    Bill.deleteMany({}),
  ]);

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const demoPassword = await bcrypt.hash("Demo@123", 10);

  await User.insertMany([
    {
      name: "System Administrator",
      email: "admin@his.local",
      password: adminPassword,
      role: "admin",
      phone: "9000000001",
    },
    {
      name: "Dr. Medical Admin",
      email: "doctor@his.local",
      password: demoPassword,
      role: "doctor",
      phone: "9000000002",
    },
    {
      name: "Nurse Coordinator",
      email: "nurse@his.local",
      password: demoPassword,
      role: "nurse",
      phone: "9000000003",
    },
    {
      name: "Front Desk Receptionist",
      email: "reception@his.local",
      password: demoPassword,
      role: "receptionist",
      phone: "9000000004",
    },
    {
      name: "Pharmacy Manager",
      email: "pharmacy@his.local",
      password: demoPassword,
      role: "pharmacist",
      phone: "9000000005",
    },
    {
      name: "Laboratory Technician",
      email: "lab@his.local",
      password: demoPassword,
      role: "lab",
      phone: "9000000006",
    },
    {
      name: "Accounts Manager",
      email: "accounts@his.local",
      password: demoPassword,
      role: "accountant",
      phone: "9000000007",
    },
  ]);

  const doctorData = [];
  for (let i = 0; i < 25; i++) {
    const dept = departments[i % departments.length];
    doctorData.push({
      name: `Dr. ${firstNames[(i + 8) % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`,
      specialization: specialization[dept],
      department: dept,
      phone: `98${String(10000000 + i).slice(-8)}`,
      email: `doctor${i + 1}@his.local`,
      availableDays:
        i % 3 === 0
          ? ["Monday", "Wednesday", "Friday"]
          : i % 3 === 1
            ? ["Tuesday", "Thursday", "Saturday"]
            : ["Monday", "Tuesday", "Thursday", "Friday"],
      consultation_fee: 500 + (i % 6) * 100,
      consultationFee: 500 + (i % 6) * 100,
    });
  }
  const doctors = await Doctor.insertMany(doctorData);
  await User.updateOne(
    { email: "doctor@his.local" },
    { $set: { emp_id: doctors[0]._id } },
  );
  await User.updateOne(
    { email: "doctor15@his.local" },
    {
      $set: {
        name: doctors[14].name,
        password: await bcrypt.hash("Admin@123", 10),
        role: "doctor",
        emp_id: doctors[14]._id,
        active: true,
      },
    },
    { upsert: true },
  );

  const patientData = [];
  for (let i = 1; i <= 100; i++) {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - randInt(5, 82));
    dob.setMonth(randInt(0, 11), randInt(1, 28));
    patientData.push({
      patientId: `PAT-${String(i).padStart(4, "0")}`,
      name: `${firstNames[(i * 7) % firstNames.length]} ${lastNames[(i * 5) % lastNames.length]}`,
      dob,
      gender: pick(["Male", "Female", "Other"]),
      bloodGroup: pick(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
      phone: `97${String(10000000 + i).slice(-8)}`,
      email: `patient${i}@example.com`,
      address: `${randInt(10, 999)} ${pick(["MG Road", "Station Road", "Civil Lines", "Main Market", "Park Avenue", "University Road"])}, Bhopal`,
      emergencyContact: `9${randInt(700000000, 999999999)}`,
      history: pick([
        "No significant medical history",
        "History of hypertension",
        "History of diabetes",
        "Previous minor surgery",
        "Seasonal allergies",
        "History of asthma",
      ]),
      allergies: pick([
        "None known",
        "Penicillin",
        "Dust",
        "Pollen",
        "NSAIDs",
        "Peanuts",
      ]),
    });
  }
  const patients = await Patient.insertMany(patientData);

  const medData = [];
  for (let i = 1; i <= 100; i++) {
    const [name, category, qty, reorder, price] =
      medicineTypes[(i - 1) % medicineTypes.length];
    medData.push({
      name:
        i <= medicineTypes.length
          ? name
          : `${name} - Pack ${Math.ceil(i / medicineTypes.length)}`,
      batchNo: `B${new Date().getFullYear()}-${String(i).padStart(4, "0")}`,
      category,
      quantity: Math.max(0, qty + randInt(-15, 60)),
      reorderLevel: reorder,
      unitPrice: Number((price + random() * price * 0.25).toFixed(2)),
      expiryDate: dateFromNow(randInt(120, 900)),
    });
  }
  const insertedMeds = await Medicine.insertMany(medData);

  const appointments = [];
  for (let i = 0; i < 200; i++) {
    const days = i < 120 ? -randInt(1, 120) : randInt(1, 90);
    appointments.push({
      patient: patients[i % patients.length]._id,
      doctor: doctors[(i * 7) % doctors.length]._id,
      date: dateFromNow(days, randInt(9, 17)),
      status:
        days < 0
          ? pick([
              "completed",
              "completed",
              "completed",
              "cancelled",
              "no-show",
            ])
          : "scheduled",
      reason: pick(reasons),
      notes: pick([
        "Patient advised to continue routine monitoring.",
        "Follow-up recommended after investigations.",
        "Bring previous medical reports to next visit.",
        "Vitals checked before consultation.",
      ]),
    });
  }
  await Appointment.insertMany(appointments);

  const prescriptions = [];
  for (let i = 0; i < 150; i++) {
    const meds = [];
    for (let j = 0; j < randInt(1, 4); j++) {
      const med = insertedMeds[(i * 7 + j) % insertedMeds.length];
      meds.push({
        name: med.name,
        dosage: pick(["1 tablet", "1 capsule", "5 ml", "2 tablets"]),
        frequency: pick([
          "Once daily",
          "Twice daily",
          "Three times daily",
          "After meals",
          "Before meals",
          "At bedtime",
        ]),
        duration: pick([
          "3 days",
          "5 days",
          "7 days",
          "10 days",
          "14 days",
          "30 days",
        ]),
        quantity: randInt(5, 30),
      });
    }
    prescriptions.push({
      patient: patients[(i * 3) % patients.length]._id,
      doctor: doctors[(i * 5) % doctors.length]._id,
      medicines: meds,
      instructions: pick([
        "Take medicines with water and follow the prescribed schedule.",
        "Complete the prescribed course and return for follow-up.",
        "Avoid self-medication and report any adverse reaction.",
      ]),
    });
  }
  await Prescription.insertMany(prescriptions);

  const labs = [];
  for (let i = 0; i < 150; i++) {
    const orderedAt = dateFromNow(-randInt(0, 90), randInt(8, 18));
    const status = pick(["ordered", "processing", "completed"]);
    labs.push({
      patient: patients[(i * 11) % patients.length]._id,
      testName: pick(tests),
      status,
      result:
        status === "completed"
          ? pick([
              "Within normal limits",
              "Mild elevation observed; clinical correlation advised.",
              "No significant abnormality detected.",
              "Borderline result; repeat test recommended.",
            ])
          : "",
      orderedAt,
      completedAt:
        status === "completed"
          ? new Date(orderedAt.getTime() + randInt(2, 48) * 3600000)
          : undefined,
    });
  }
  await LabTest.insertMany(labs);

  const beds = [];
  for (let i = 1; i <= 50; i++) {
    const [ward, type] = wards[(i - 1) % wards.length];
    const status =
      i <= 30
        ? pick(["available", "available", "occupied"])
        : pick(["available", "occupied", "maintenance"]);
    beds.push({
      ward,
      bedNumber: `${type.substring(0, 3).toUpperCase()}-${String(i).padStart(3, "0")}`,
      type: pick(["Standard", "Semi-Private", "Private", "ICU"]),
      status,
      patient:
        status === "occupied"
          ? patients[(i * 9) % patients.length]._id
          : undefined,
    });
  }
  await Bed.insertMany(beds);

  const bills = [];
  for (let i = 0; i < 150; i++) {
    const items = [
      {
        description: "Doctor Consultation",
        category: "Consultation",
        amount: randInt(500, 1100),
      },
      {
        description: pick([
          "Laboratory Investigation",
          "Blood Test",
          "Diagnostic Test",
          "Radiology Investigation",
        ]),
        category: "Laboratory",
        amount: randInt(250, 1800),
      },
    ];
    if (i % 2 === 0)
      items.push({
        description: "Medicine Charges",
        category: "Pharmacy",
        amount: randInt(150, 2500),
      });
    if (i % 5 === 0)
      items.push({
        description: "Bed / Ward Charges",
        category: "Admission",
        amount: randInt(1000, 5000),
      });
    if (i % 7 === 0)
      items.push({
        description: "Procedure Charges",
        category: "Procedure",
        amount: randInt(1000, 7000),
      });
    const total = items.reduce((s, x) => s + x.amount, 0);
    const status = pick(["paid", "paid", "paid", "pending", "partial"]);
    bills.push({
      patient: patients[(i * 13) % patients.length]._id,
      items,
      total,
      status,
      paymentMethod:
        status === "pending"
          ? undefined
          : pick(["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking"]),
      paidAt:
        status === "pending"
          ? undefined
          : dateFromNow(-randInt(0, 90), randInt(9, 18)),
    });
  }
  await Bill.insertMany(bills);

  console.log("\n========== HIS SEED COMPLETE ==========");
  console.log("Users:        ", await User.countDocuments());
  console.log("Patients:     ", await Patient.countDocuments());
  console.log("Doctors:      ", await Doctor.countDocuments());
  console.log("Appointments: ", await Appointment.countDocuments());
  console.log("Prescriptions:", await Prescription.countDocuments());
  console.log("Medicines:    ", await Medicine.countDocuments());
  console.log("Lab Tests:    ", await LabTest.countDocuments());
  console.log("Beds:         ", await Bed.countDocuments());
  console.log("Bills:        ", await Bill.countDocuments());
  console.log("\nAdmin: admin@his.local / Admin@123");
  console.log("Demo:  doctor@his.local / Demo@123");
  console.log("========================================\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\nSEED FAILED:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
