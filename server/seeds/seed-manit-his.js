import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  Hospital,
  Department,
  Role,
  RoleDepartment,
  Employee,
  Doctor,
  MedicalStaff,
  AdminStaff,
  Patient,
  MedicalHistory,
  Room,
  Appointment,
  Admission,
  NurseAssignment,
  TestType,
  LabTest,
  Medicine,
  Pharmacy,
  PharmacyStaff,
  PharmacyMedicineStock,
  Prescription,
  PrescriptionMedicine,
  Bill,
  AppointmentCharge,
  MedicineCharge,
  TestCharge,
  AdmissionCharge,
  User,
} from "../models/index.js";

dotenv.config();
if (!process.env.MONGO_URI) {
  dotenv.config({ path: "./server/.env" });
}
if (!process.env.MONGO_URI) {
  dotenv.config({ path: "../.env" });
}

async function seedDatabase() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to database:", mongoose.connection.name);

  // 1. HOSPITAL FACILITY
  let hospital = await Hospital.findOne({ hospital_id: "HOSP-01" });
  if (!hospital) {
    hospital = await Hospital.create({
      hospital_id: "HOSP-01",
      h_name: "MANIT Health Care & Research Hospital",
      address:
        "Maulana Azad National Institute of Technology Campus, Link Road 3, Bhopal, MP 462003",
      phone: "+91-755-4051000",
      email: "hospital@manit.ac.in",
    });
    console.log("Seeded Hospital:", hospital.h_name);
  }

  // 2. DEPARTMENTS
  const depts = [
    {
      department_id: "DEP-01",
      dept_name: "Cardiology",
      description: "Heart & Vascular Care",
    },
    {
      department_id: "DEP-02",
      dept_name: "Neurology",
      description: "Brain & Nervous System",
    },
    {
      department_id: "DEP-03",
      dept_name: "General Medicine",
      description: "Primary & Internal Care",
    },
    {
      department_id: "DEP-04",
      dept_name: "Orthopedics",
      description: "Bones & Joints",
    },
    {
      department_id: "DEP-05",
      dept_name: "Emergency",
      description: "24/7 Critical Trauma Care",
    },
    {
      department_id: "DEP-06",
      dept_name: "Laboratory",
      description: "Diagnostic Pathology",
    },
    {
      department_id: "DEP-07",
      dept_name: "Pharmacy",
      description: "Dispensary & Pharmaceuticals",
    },
    {
      department_id: "DEP-08",
      dept_name: "Administration",
      description: "Hospital Management & Billing",
    },
  ];

  const deptMap = {};
  for (const d of depts) {
    let deptDoc = await Department.findOne({ department_id: d.department_id });
    if (!deptDoc) {
      deptDoc = await Department.create({ ...d, hospital_id: hospital._id });
    }
    deptMap[d.dept_name] = deptDoc;
  }

  // 3. ROLES
  const roles = [
    { role_id: "ROL-01", role_name: "Doctor" },
    { role_id: "ROL-02", role_name: "Nurse" },
    { role_id: "ROL-03", role_name: "Lab Technician" },
    { role_id: "ROL-04", role_name: "Pharmacist" },
    { role_id: "ROL-05", role_name: "Admin" },
    { role_id: "ROL-06", role_name: "Receptionist" },
    { role_id: "ROL-07", role_name: "Accountant" },
  ];

  const roleMap = {};
  for (const r of roles) {
    let roleDoc = await Role.findOne({ role_id: r.role_id });
    if (!roleDoc) {
      roleDoc = await Role.create(r);
    }
    roleMap[r.role_name] = roleDoc;
  }

  // 4. TEST TYPES CATALOG
  const testTypes = [
    {
      test_type_id: "TT-01",
      test_name: "Complete Blood Count (CBC)",
      price: 350,
      normal_range: "Hb: 12-16 g/dL, WBC: 4000-11000",
      category: "Hematology",
    },
    {
      test_type_id: "TT-02",
      test_name: "Lipid Profile",
      price: 650,
      normal_range: "Cholesterol < 200 mg/dL",
      category: "Biochemistry",
    },
    {
      test_type_id: "TT-03",
      test_name: "Liver Function Test (LFT)",
      price: 750,
      normal_range: "SGOT: 5-40 U/L, SGPT: 7-56 U/L",
      category: "Biochemistry",
    },
    {
      test_type_id: "TT-04",
      test_name: "Kidney Function Test (KFT)",
      price: 700,
      normal_range: "Creatinine: 0.7-1.3 mg/dL",
      category: "Biochemistry",
    },
    {
      test_type_id: "TT-05",
      test_name: "Chest X-Ray Digital",
      price: 500,
      normal_range: "Bilateral lung fields clear",
      category: "Radiology",
    },
    {
      test_type_id: "TT-06",
      test_name: "ECG 12-Lead",
      price: 400,
      normal_range: "Normal sinus rhythm",
      category: "Cardiology",
    },
  ];

  const testTypeMap = {};
  for (const tt of testTypes) {
    let ttDoc = await TestType.findOne({ test_type_id: tt.test_type_id });
    if (!ttDoc) {
      ttDoc = await TestType.create(tt);
    }
    testTypeMap[tt.test_name] = ttDoc;
  }

  // 5. MEDICINES
  const meds = [
    {
      med_id: "MED-01",
      name: "Paracetamol 500mg",
      manufacturer: "Cipla",
      unit_price: 2.5,
      quantity: 150,
      reorder_level: 25,
      expiry_date: new Date("2027-12-31"),
      batch_no: "PCM-2026A",
      category: "Analgesic",
    },
    {
      med_id: "MED-02",
      name: "Amoxicillin 500mg",
      manufacturer: "Sun Pharma",
      unit_price: 9.0,
      quantity: 45,
      reorder_level: 20,
      expiry_date: new Date("2027-06-30"),
      batch_no: "AMX-2026B",
      category: "Antibiotic",
    },
    {
      med_id: "MED-03",
      name: "Metformin 500mg",
      manufacturer: "Dr. Reddy's",
      unit_price: 4.0,
      quantity: 80,
      reorder_level: 20,
      expiry_date: new Date("2027-09-30"),
      batch_no: "MET-2026C",
      category: "Antidiabetic",
    },
    {
      med_id: "MED-04",
      name: "Atorvastatin 10mg",
      manufacturer: "Lupin",
      unit_price: 12.0,
      quantity: 60,
      reorder_level: 15,
      expiry_date: new Date("2027-11-30"),
      batch_no: "ATV-2026D",
      category: "Cardiovascular",
    },
    {
      med_id: "MED-05",
      name: "Pantoprazole 40mg",
      manufacturer: "Alkem",
      unit_price: 6.5,
      quantity: 100,
      reorder_level: 30,
      expiry_date: new Date("2028-01-31"),
      batch_no: "PAN-2026E",
      category: "Gastrointestinal",
    },
    {
      med_id: "MED-06",
      name: "Azithromycin 500mg",
      manufacturer: "Zydus",
      unit_price: 15.0,
      quantity: 10,
      reorder_level: 15,
      expiry_date: new Date("2027-05-15"),
      batch_no: "AZI-2026F",
      category: "Antibiotic",
    }, // low stock
  ];

  const medMap = {};
  for (const m of meds) {
    let medDoc = await Medicine.findOne({ med_id: m.med_id });
    if (!medDoc) {
      medDoc = await Medicine.create({
        ...m,
        unitPrice: m.unit_price,
        reorderLevel: m.reorder_level,
        expiryDate: m.expiry_date,
        batchNo: m.batch_no,
      });
    }
    medMap[m.name] = medDoc;
  }

  // 6. PHARMACY
  let pharmacy = await Pharmacy.findOne({ pharmacy_id: "PHARM-01" });
  if (!pharmacy) {
    pharmacy = await Pharmacy.create({
      pharmacy_id: "PHARM-01",
      hospital_id: hospital._id,
      name: "MANIT Central Dispensary",
      location: "Ground Floor, OPD Wing",
      phone: "+91-755-4051025",
    });
  }

  // 7. ROOMS & WARDS
  const rooms = [
    {
      room_id: "RM-101",
      room_number: "G-101",
      room_type: "General Ward",
      daily_rate: 500,
      status: "available",
    },
    {
      room_id: "RM-102",
      room_number: "G-102",
      room_type: "General Ward",
      daily_rate: 500,
      status: "available",
    },
    {
      room_id: "RM-103",
      room_number: "G-103",
      room_type: "General Ward",
      daily_rate: 500,
      status: "available",
    },
    {
      room_id: "RM-201",
      room_number: "ICU-01",
      room_type: "ICU",
      daily_rate: 2500,
      status: "available",
    },
    {
      room_id: "RM-202",
      room_number: "ICU-02",
      room_type: "ICU",
      daily_rate: 2500,
      status: "available",
    },
    {
      room_id: "RM-301",
      room_number: "SP-301",
      room_type: "Semi-Private",
      daily_rate: 1200,
      status: "available",
    },
  ];

  const roomMap = {};
  for (const rm of rooms) {
    let rmDoc = await Room.findOne({ room_id: rm.room_id });
    if (!rmDoc) {
      rmDoc = await Room.create({
        ...rm,
        hospital_id: hospital._id,
        bedNumber: rm.room_number,
        ward: rm.room_type,
      });
    }
    roomMap[rm.room_number] = rmDoc;
  }

  // 8. EMPLOYEES & STAFF HIERARCHY
  const employees = [
    // Senior Doctors
    {
      emp_id: "EMP-1001",
      name: "Dr. Kavita Rao",
      gender: "M",
      role_name: "Doctor",
      department_name: "Cardiology",
      salary: 180000,
      specialization: "Senior Interventional Cardiologist",
      license_no: "MP-MED-98210",
      consultation_fee: 1000,
      email: "kavita.rao@his.local",
    },
    {
      emp_id: "EMP-1002",
      name: "Dr. Arjun Mehta",
      gender: "M",
      role_name: "Doctor",
      department_name: "Neurology",
      salary: 175000,
      specialization: "Senior Consultant Neurologist",
      license_no: "MP-MED-98211",
      consultation_fee: 900,
      email: "arjun.mehta@his.local",
    },
    {
      emp_id: "EMP-1003",
      name: "Dr. Ananya Sharma",
      gender: "F",
      role_name: "Doctor",
      department_name: "General Medicine",
      salary: 120000,
      specialization: "General Physician & Diabetologist",
      license_no: "MP-MED-98212",
      consultation_fee: 600,
      email: "ananya.sharma@his.local",
    },
    {
      emp_id: "EMP-1004",
      name: "Dr. Rahul Verma",
      gender: "M",
      role_name: "Doctor",
      department_name: "Orthopedics",
      salary: 130000,
      specialization: "Orthopedic & Trauma Surgeon",
      license_no: "MP-MED-98213",
      consultation_fee: 700,
      email: "rahul.verma@his.local",
    },
    // Nurses (for workload balancing)
    {
      emp_id: "EMP-2001",
      name: "Nurse Sunita Rao",
      gender: "F",
      role_name: "Nurse",
      department_name: "Emergency",
      salary: 65000,
      staff_type: "Nurse",
      email: "sunita.rao@his.local",
    },
    {
      emp_id: "EMP-2002",
      name: "Nurse Kavita Nair",
      gender: "F",
      role_name: "Nurse",
      department_name: "General Medicine",
      salary: 62000,
      staff_type: "Nurse",
      email: "kavita.nair@his.local",
    },
    {
      emp_id: "EMP-2003",
      name: "Nurse Deepa Joseph",
      gender: "F",
      role_name: "Nurse",
      department_name: "Cardiology",
      salary: 64000,
      staff_type: "Nurse",
      email: "deepa.joseph@his.local",
    },
    // Lab Tech
    {
      emp_id: "EMP-3001",
      name: "Ramesh Meena",
      gender: "M",
      role_name: "Lab Technician",
      department_name: "Laboratory",
      salary: 55000,
      staff_type: "Lab Technician",
      email: "ramesh.meena@his.local",
    },
    // Pharmacist
    {
      emp_id: "EMP-4001",
      name: "Rajesh Gupta",
      gender: "M",
      role_name: "Pharmacist",
      department_name: "Pharmacy",
      salary: 58000,
      staff_type: "Pharmacist",
      email: "rajesh.gupta@his.local",
    },
    // Hospital administrators
    {
      emp_id: "EMP-5001",
      name: "IT Administrator",
      gender: "M",
      role_name: "Admin",
      department_name: "Administration",
      salary: 90000,
      admin_role: "IT",
      email: "it.admin@his.local",
    },
    {
      emp_id: "EMP-5002",
      name: "Billing Administrator",
      gender: "M",
      role_name: "Admin",
      department_name: "Administration",
      salary: 90000,
      admin_role: "Billing",
      email: "billing.admin@his.local",
    },
    {
      emp_id: "EMP-5003",
      name: "HR Administrator",
      gender: "F",
      role_name: "Admin",
      department_name: "Administration",
      salary: 88000,
      admin_role: "HR",
      email: "hr.admin@his.local",
    },
    // {
    //   emp_id: "EMP-5004",
    //   name: "Bhavishya Sisodiya",
    //   gender: "M",
    //   role_name: "Admin",
    //   department_name: "Administration",
    //   salary: 88000,
    //   admin_role: "Receptionist",
    //   email: "bhavishya@manit.ac.in",
    // },
  ];

  const doctorMap = {};
  for (const emp of employees) {
    let empDoc = await Employee.findOne({ emp_id: emp.emp_id });
    if (!empDoc) {
      empDoc = await Employee.create({
        emp_id: emp.emp_id,
        name: emp.name,
        gender: emp.gender,
        role_name: emp.role_name,
        department_name: emp.department_name,
        salary: emp.salary,
        email: emp.email,
        department_id: deptMap[emp.department_name]?._id,
        role_id: roleMap[emp.role_name]?._id,
      });
    }

    if (emp.role_name === "Doctor") {
      let docRecord = await Doctor.findOne({ emp_id: empDoc._id });
      if (!docRecord) {
        docRecord = await Doctor.create({
          emp_id: empDoc._id,
          employee_code: emp.emp_id,
          name: emp.name,
          specialization: emp.specialization,
          license_no: emp.license_no,
          department: emp.department_name,
          consultation_fee: emp.consultation_fee,
          consultationFee: emp.consultation_fee,
          email: emp.email,
        });
      }
      doctorMap[emp.name] = docRecord;
    } else if (
      ["Nurse", "Lab Technician", "Pharmacist"].includes(emp.role_name)
    ) {
      let staffRecord = await MedicalStaff.findOne({ emp_id: empDoc._id });
      if (!staffRecord) {
        await MedicalStaff.create({
          emp_id: empDoc._id,
          name: emp.name,
          staff_type: emp.staff_type,
          department: emp.department_name,
        });
      }
    } else {
      let adminRecord = await AdminStaff.findOne({ emp_id: empDoc._id });
      if (!adminRecord) {
        await AdminStaff.create({
          emp_id: empDoc._id,
          name: emp.name,
          admin_role: emp.admin_role || "IT",
          email: emp.email,
        });
      }
    }
  }

  // 9. SEED ADMIN USER FOR AUTH
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  await User.updateOne(
    { email: "admin@his.local" },
    {
      $set: {
        name: "Hospital Admin",
        password: passwordHash,
        role: "admin",
      },
    },
    { upsert: true },
  );

  // Doctor user
  await User.updateOne(
    { email: "doctor@his.local" },
    {
      $set: {
        name: "Dr. Kavita Rao",
        password: passwordHash,
        role: "doctor",
        emp_id: (await Doctor.findOne({ name: "Dr. Kavita Rao" }))?._id,
      },
    },
    { upsert: true },
  );

  // Dedicated demo login requested for the fifteenth doctor account.
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
        password: passwordHash,
        role: "doctor",
        emp_id: doctor15._id,
        active: true,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: "pharmacist@his.local" },
    {
      $set: {
        name: "Rajesh Gupta",
        password: passwordHash,
        role: "pharmacist",
      },
    },
    { upsert: true },
  );

  // Role-specific demo accounts use the same seeded password for easy local testing.
  for (const account of [
    { email: "nurse@his.local", name: "Nurse Sunita Rao", role: "nurse" },
    { email: "reception@his.local", name: "Front Desk Receptionist", role: "receptionist" },
    { email: "lab@his.local", name: "Ramesh Meena", role: "lab" },
    { email: "accounts@his.local", name: "Billing Administrator", role: "accountant" },
  ]) {
    const linkedNurse = account.role === "nurse"
      ? await Employee.findOne({ email: "sunita.rao@his.local" })
      : null;
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          name: account.name,
          password: passwordHash,
          role: account.role,
          active: true,
          ...(linkedNurse ? { emp_id: linkedNurse._id } : {}),
        },
      },
      { upsert: true },
    );
  }

  // 10. PATIENTS
  const patients = [
    {
      patient_id: "PAT-1001",
      name: "Vikram Malhotra",
      dob: new Date("1985-04-12"),
      gender: "M",
      phone: "9826011223",
      email: "vikram.m@gmail.com",
      address: "Arera Colony, Bhopal",
      blood_group: "B+",
      status: "OPD",
    },
    {
      patient_id: "PAT-1002",
      name: "Pooja Verma",
      dob: new Date("1992-08-23"),
      gender: "F",
      phone: "9826022334",
      email: "pooja.v@gmail.com",
      address: "MP Nagar Zone 2, Bhopal",
      blood_group: "O+",
      status: "IPD",
    },
    {
      patient_id: "PAT-1003",
      name: "Suresh Chandra",
      dob: new Date("1960-11-05"),
      gender: "M",
      phone: "9826033445",
      email: "suresh.c@gmail.com",
      address: "Kolar Road, Bhopal",
      blood_group: "A+",
      status: "OPD",
    },
    {
      patient_id: "PAT-1004",
      name: "Anjali Saxena",
      dob: new Date("1998-02-18"),
      gender: "F",
      phone: "9826044556",
      email: "anjali.s@gmail.com",
      address: "Shahpura, Bhopal",
      blood_group: "AB+",
      status: "OPD",
    },
  ];

  const patMap = {};
  for (const p of patients) {
    let pDoc = await Patient.findOne({ patient_id: p.patient_id });
    if (!pDoc) {
      pDoc = await Patient.create({
        ...p,
        patientId: p.patient_id,
        bloodGroup: p.blood_group,
      });
      // Seed medical history
      await MedicalHistory.create({
        history_id: `HIST-${p.patient_id}`,
        patient_id: pDoc._id,
        condition_md: p.name.includes("Suresh")
          ? "Type 2 Diabetes Mellitus & Hypertension"
          : "Routine clinical assessment",
        diagnosis_date: new Date("2026-01-10"),
        notes: "Regular follow-up advised.",
      });
    }
    patMap[p.patient_id] = pDoc;
  }

  const demoPatient = patMap["PAT-1001"];
  await User.updateOne(
    { email: "patient@his.local" },
    {
      $set: {
        name: demoPatient.name,
        password: await bcrypt.hash("Admin@123", 10),
        role: "patient",
        patient_id: demoPatient._id,
        active: true,
      },
    },
    { upsert: true },
  );

  // 11. INPATIENT ADMISSION FOR PAT-1002 (Pooja Verma in ICU-01)
  const ipdPatient = patMap["PAT-1002"];
  const icuRoom = roomMap["ICU-01"];
  const attendingDoc = doctorMap["Dr. Kavita Rao"];
  const assignedNurse = await MedicalStaff.findOne({
    name: "Nurse Deepa Joseph",
  });

  let admission = await Admission.findOne({
    patient_id: ipdPatient._id,
    status: "admitted",
  });
  if (!admission && icuRoom && attendingDoc) {
    admission = await Admission.create({
      admission_id: "ADM-1001",
      patient_id: ipdPatient._id,
      patient: ipdPatient._id,
      room_id: icuRoom._id,
      doctor_emp_id: attendingDoc._id,
      doctor: attendingDoc._id,
      admission_date: new Date(Date.now() - 2 * 86400000), // admitted 2 days ago
      status: "admitted",
      diagnosis: "Acute Coronary Observation",
      assigned_nurse: assignedNurse?._id,
      nurse_name: assignedNurse?.name,
    });

    await Room.findByIdAndUpdate(icuRoom._id, {
      status: "occupied",
      patient: ipdPatient._id,
    });
    await Patient.findByIdAndUpdate(ipdPatient._id, {
      active_admission_id: admission._id,
      status: "IPD",
    });
    if (assignedNurse) {
      await NurseAssignment.create({
        admission_id: admission._id,
        nurse_emp_id: assignedNurse._id,
        active: true,
      });
    }
    console.log(
      "Seeded Inpatient Admission for:",
      ipdPatient.name,
      "in",
      icuRoom.room_number,
    );
  }

  // 12. APPOINTMENTS
  const apptPatient = patMap["PAT-1001"];
  const orthoDoc = doctorMap["Dr. Rahul Verma"];
  let appt = await Appointment.findOne({ appointment_id: "APT-1001" });
  if (!appt && apptPatient && orthoDoc) {
    appt = await Appointment.create({
      appointment_id: "APT-1001",
      patient_id: apptPatient._id,
      patient: apptPatient._id,
      doctor_emp_id: orthoDoc._id,
      doctor: orthoDoc._id,
      appointment_date: new Date(),
      date: new Date(),
      start_time: "10:30",
      end_time: "11:00",
      status: "scheduled",
      reason: "Right knee arthralgia evaluation",
      consultation_fee: orthoDoc.consultation_fee || 700,
    });
  }

  // 13. MASTER BILL WITH CHARGES (CONSOLIDATED BILLING)
  let bill = await Bill.findOne({
    patient_id: apptPatient._id,
    status: "pending",
  });
  if (!bill) {
    bill = await Bill.create({
      bill_id: "INV-1001",
      patient_id: apptPatient._id,
      patient: apptPatient._id,
      bill_date: new Date(),
      status: "pending",
      total_amount: 1550,
      consultation_charges: 700,
      lab_charges: 500,
      pharmacy_charges: 350,
      room_charges: 0,
    });

    console.log(
      "Seeded Consolidated Bill:",
      bill.bill_id,
      "for",
      apptPatient.name,
    );
  }

  // Upsert the sample charges on every run. This also recovers cleanly if a
  // previous run created the bill but stopped partway through its charges.
  if (appt) {
    await AppointmentCharge.updateOne(
      { bill_id: bill._id, appointment_id: appt._id },
      {
        $set: {
          charge_id: `AC-${bill.bill_id}`,
          consultation_fee: 700,
        },
      },
      { upsert: true },
    );
  }

  // Add or reuse the sample X-Ray test, then ensure its bill charge exists.
  const xrayTest = await LabTest.findOne({ test_id: "LAB-1001" }) || await LabTest.create({
    test_id: "LAB-1001",
    test_type_id: testTypeMap["Chest X-Ray Digital"]?._id,
    testName: "Chest X-Ray Digital",
    patient_id: apptPatient._id,
    doctor_emp_id: orthoDoc?._id,
    status: "completed",
    charge_amount: 500,
    result:
      "Bone density and alignment within normal limits. Mild degenerative changes.",
  });

  await TestCharge.updateOne(
    { bill_id: bill._id, test_id: xrayTest._id },
    {
      $set: {
        charge_id: `TC-${bill.bill_id}`,
        test_name: "Chest X-Ray Digital",
        amount: 500,
      },
    },
    { upsert: true },
  );

  const paracetamol = medMap["Paracetamol 500mg"];
  if (paracetamol) {
    await MedicineCharge.updateOne(
      { bill_id: bill._id, med_id: paracetamol._id },
      {
        $set: {
          charge_id: `MC-${bill.bill_id}`,
          medicine_name: "Paracetamol 500mg",
          quantity: 10,
          amount: 25,
        },
      },
      { upsert: true },
    );
  }

  console.log("MANIT HIS Database seeding completed successfully!");
  await mongoose.disconnect();
}

seedDatabase().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
