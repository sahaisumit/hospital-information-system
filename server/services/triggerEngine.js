import mongoose from "mongoose";
import {
  Employee,
  Doctor,
  MedicalStaff,
  AdminStaff,
  Appointment,
  Prescription,
  Medicine,
  LabTest,
  TestType,
  Room,
  Admission,
  NurseAssignment,
  PharmacyMedicineStock,
  PharmacyStaff,
  Bill,
  AppointmentCharge,
  MedicineCharge,
  TestCharge,
  AdmissionCharge,
  Patient,
} from "../models/index.js";

/**
 * Trigger Engine: Implements the 35 Database Triggers and Business Rules
 * specified in the HIS specification (PDF Pages 29-30).
 */
export const TriggerEngine = {
  // ==========================================
  // BILL RECALCULATION TRIGGERS (Triggers 24-35)
  // ==========================================
  async recalculateBill(billId) {
    if (!billId) return null;
    const bId = mongoose.Types.ObjectId.isValid(billId)
      ? new mongoose.Types.ObjectId(billId)
      : billId;

    const [apptCharges, medCharges, testCharges, admCharges] = await Promise.all([
      AppointmentCharge.find({ bill_id: bId }),
      MedicineCharge.find({ bill_id: bId }),
      TestCharge.find({ bill_id: bId }),
      AdmissionCharge.find({ bill_id: bId }),
    ]);

    const consultationTotal = apptCharges.reduce((sum, c) => sum + (c.consultation_fee || 0), 0);
    const pharmacyTotal = medCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
    const labTotal = testCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
    const roomTotal = admCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

    const grandTotal = consultationTotal + pharmacyTotal + labTotal + roomTotal;

    // Build consolidated items array for backward compatibility
    const items = [
      ...apptCharges.map((c) => ({
        description: `Consultation Fee (Appt #${c.charge_id})`,
        category: "Consultation",
        amount: c.consultation_fee,
      })),
      ...medCharges.map((c) => ({
        description: `Medicine: ${c.medicine_name || "Dispensed Drug"} (Qty: ${c.quantity})`,
        category: "Pharmacy",
        amount: c.amount,
      })),
      ...testCharges.map((c) => ({
        description: `Lab Test: ${c.test_name || "Diagnostic Test"}`,
        category: "Laboratory",
        amount: c.amount,
      })),
      ...admCharges.map((c) => ({
        description: `Inpatient Room Stay: ${c.room_number || "Ward Room"} (${c.days_stayed} day(s))`,
        category: "Inpatient Room",
        amount: c.amount,
      })),
    ];

    const updated = await Bill.findByIdAndUpdate(
      bId,
      {
        total_amount: grandTotal,
        total: grandTotal,
        consultation_charges: consultationTotal,
        pharmacy_charges: pharmacyTotal,
        lab_charges: labTotal,
        room_charges: roomTotal,
        items,
      },
      { new: true }
    );

    return updated;
  },

  // Helper: Get or create active pending Bill for a patient
  async getOrCreatePendingBill(patientId) {
    const pId = mongoose.Types.ObjectId.isValid(patientId)
      ? new mongoose.Types.ObjectId(patientId)
      : patientId;

    let bill = await Bill.findOne({ patient_id: pId, status: "pending" });
    if (!bill) {
      const billCount = await Bill.countDocuments();
      bill = await Bill.create({
        bill_id: `INV-${String(billCount + 1001).padStart(4, "0")}`,
        patient_id: pId,
        patient: pId,
        bill_date: new Date(),
        total_amount: 0,
        status: "pending",
      });
    }
    return bill;
  },

  // ==========================================
  // EMPLOYEE & STAFF TRIGGERS (Triggers 1-6)
  // ==========================================

  // Trigger 1 & 2: trg_validate_role_department & update
  async validateRoleDepartment(roleName, deptName) {
    const validPairs = {
      Doctor: [
        "Cardiology",
        "Emergency",
        "Radiology",
        "Neurology",
        "Orthopedics",
        "General Medicine",
        "Pediatrics",
        "General Surgery",
      ],
      Nurse: [
        "Cardiology",
        "Emergency",
        "General Medicine",
        "Orthopedics",
        "Pediatrics",
        "General Surgery",
      ],
      "Lab Technician": ["Laboratory", "Radiology"],
      Pharmacist: ["Pharmacy"],
      Admin: ["Administration"],
      Receptionist: ["Administration", "Emergency"],
      Accountant: ["Administration"],
    };

    if (roleName && deptName && validPairs[roleName]) {
      const allowed = validPairs[roleName];
      if (!allowed.some((d) => d.toLowerCase() === deptName.toLowerCase())) {
        throw new Error(
          `Trigger [trg_validate_role_department]: Role '${roleName}' is not permitted in department '${deptName}'. Allowed: ${allowed.join(", ")}`
        );
      }
    }
  },

  // Trigger 3: trg_check_hire_date
  validateHireDate(hireDate) {
    if (hireDate && new Date(hireDate) > new Date(Date.now() + 86400000)) {
      throw new Error("Trigger [trg_check_hire_date]: Hire date cannot be in the future");
    }
  },

  // Trigger 4: trg_employee_role_distribution
  async distributeEmployeeRole(employeeDoc, extraData = {}) {
    const role = (employeeDoc.role_name || "").toLowerCase();
    const empId = employeeDoc._id;

    if (role === "doctor") {
      const existing = await Doctor.findOne({ emp_id: empId });
      if (!existing) {
        await Doctor.create({
          emp_id: empId,
          employee_code: employeeDoc.emp_id,
          name: employeeDoc.name,
          specialization: extraData.specialization || "General Medicine",
          license_no: extraData.license_no || `MED-LIC-${employeeDoc.emp_id}`,
          department: employeeDoc.department_name || extraData.department || "General Medicine",
          phone: employeeDoc.phone,
          email: employeeDoc.email,
          consultation_fee: extraData.consultation_fee || 500,
          consultationFee: extraData.consultation_fee || 500,
        });
      }
    } else if (["nurse", "lab technician", "pharmacist", "lab"].includes(role)) {
      const staffType =
        role === "nurse"
          ? "Nurse"
          : role === "pharmacist"
            ? "Pharmacist"
            : "Lab Technician";
      const existing = await MedicalStaff.findOne({ emp_id: empId });
      if (!existing) {
        await MedicalStaff.create({
          emp_id: empId,
          name: employeeDoc.name,
          staff_type: staffType,
          department: employeeDoc.department_name || staffType,
        });
      }
    } else {
      // Admin, Receptionist, Accountant
      const adminRole =
        role === "receptionist"
          ? "Receptionist"
          : role === "accountant"
            ? "Billing"
            : extraData.admin_role || "IT";
      const existing = await AdminStaff.findOne({ emp_id: empId });
      if (!existing) {
        await AdminStaff.create({
          emp_id: empId,
          name: employeeDoc.name,
          admin_role: adminRole,
          email: employeeDoc.email,
        });
      }
    }
  },

  // Trigger 5: trg_validate_medical_staff
  validateMedicalStaffType(staffType) {
    const allowed = ["Nurse", "Lab Technician", "Pharmacist"];
    if (!allowed.includes(staffType)) {
      throw new Error(
        `Trigger [trg_validate_medical_staff]: Invalid staff type '${staffType}'. Must be one of: ${allowed.join(", ")}`
      );
    }
  },

  // Trigger 6: trg_check_pharmacist
  async checkPharmacistRole(employeeId) {
    const emp = await Employee.findById(employeeId);
    if (!emp) throw new Error("Employee record not found");
    const role = (emp.role_name || "").toLowerCase();
    if (role !== "pharmacist") {
      throw new Error(
        "Trigger [trg_check_pharmacist]: Only qualified pharmacists can be assigned to pharmacy staff"
      );
    }
  },

  // ==========================================
  // APPOINTMENT TRIGGERS (Triggers 7-10)
  // ==========================================

  // Trigger 7: trg_no_past_appointment
  validateAppointmentDate(dateString, startTime) {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (dateString < todayString) {
      throw new Error(
        "Trigger [trg_no_past_appointment]: Cannot book an appointment for a past date"
      );
    }
  },

  // Trigger 8: trg_doctor_schedule (Avoid overlapping slots)
  async checkDoctorScheduleOverlap(doctorId, dateString, startTime, excludeApptId = null) {
    const date = new Date(dateString);
    const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999));

    const filter = {
      $or: [{ doctor_emp_id: doctorId }, { doctor: doctorId }],
      $and: [
        { $or: [
          { appointment_date: { $gte: startOfDay, $lte: endOfDay } },
          { $and: [
            { $or: [{ appointment_date: { $exists: false } }, { appointment_date: null }] },
            { date: { $gte: startOfDay, $lte: endOfDay } },
          ] },
        ] },
        { start_time: startTime },
      ],
      status: { $ne: "cancelled" },
    };
    if (excludeApptId) {
      filter._id = { $ne: excludeApptId };
    }

    const clash = await Appointment.findOne(filter);
    if (clash) {
      throw new Error(
        `Trigger [trg_doctor_schedule]: Doctor already has an appointment booked at ${startTime} on this date. Slot overlap prevented.`
      );
    }
  },

  // Trigger 9: trg_limit_doctor_daily_appointments (Max 20/day)
  async checkDoctorDailyLimit(doctorId, dateString) {
    const date = new Date(dateString);
    const startOfDay = new Date(new Date(date).setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(date).setUTCHours(23, 59, 59, 999));

    const count = await Appointment.countDocuments({
      $and: [
        { $or: [{ doctor_emp_id: doctorId }, { doctor: doctorId }] },
        { $or: [
          { appointment_date: { $gte: startOfDay, $lte: endOfDay } },
          { $and: [
            { $or: [{ appointment_date: { $exists: false } }, { appointment_date: null }] },
            { date: { $gte: startOfDay, $lte: endOfDay } },
          ] },
        ] },
        { status: { $ne: "cancelled" } },
      ],
    });

    if (count >= 20) {
      throw new Error(
        "Trigger [trg_limit_doctor_daily_appointments]: Daily limit reached. Doctor cannot exceed 20 appointments per day."
      );
    }
  },

  // Trigger 10: trg_add_appointment_charge (After Insert)
  async addAppointmentCharge(appointmentDoc) {
    let bill;
    if (appointmentDoc.payment_status === "paid" || ["Cash", "Razorpay"].includes(appointmentDoc.payment_method)) {
      const billCount = await Bill.countDocuments();
      bill = await Bill.create({
        bill_id: `INV-${String(billCount + 1001).padStart(4, "0")}`,
        patient_id: appointmentDoc.patient_id,
        patient: appointmentDoc.patient_id,
        bill_date: new Date(),
        status: appointmentDoc.payment_status === "paid" ? "paid" : "pending",
        payment_method: appointmentDoc.payment_status === "paid" ? appointmentDoc.payment_method || "Online" : "Pending",
        paymentMethod: appointmentDoc.payment_status === "paid" ? appointmentDoc.payment_method || "Online" : "Pending",
        ...(appointmentDoc.payment_status === "paid" ? { paid_at: new Date(), paidAt: new Date() } : {}),
      });
    } else {
      bill = await this.getOrCreatePendingBill(appointmentDoc.patient_id);
    }
    const doctor = await Doctor.findById(appointmentDoc.doctor_emp_id);
    const fee = appointmentDoc.consultation_fee || doctor?.consultation_fee || 500;

    const chargeCount = await AppointmentCharge.countDocuments();
    await AppointmentCharge.create({
      charge_id: `AC-${String(chargeCount + 1001).padStart(4, "0")}`,
      bill_id: bill._id,
      appointment_id: appointmentDoc._id,
      consultation_fee: fee,
    });

    await this.recalculateBill(bill._id);
    if (appointmentDoc.payment_status === "paid") {
      await Bill.findByIdAndUpdate(bill._id, { amount_paid: fee, status: "paid" });
    }
  },

  // ==========================================
  // PHARMACY & PRESCRIPTION TRIGGERS (Triggers 11-13)
  // ==========================================

  // Trigger 11: trg_check_expired_medicine
  async checkExpiredMedicine(medicineId) {
    const med = await Medicine.findById(medicineId);
    if (!med) throw new Error("Medicine not found in catalog");

    const expiry = med.expiry_date || med.expiryDate;
    if (expiry && new Date(expiry) <= new Date()) {
      throw new Error(
        `Trigger [trg_check_expired_medicine]: Cannot prescribe or dispense '${med.name}'. It expired on ${new Date(
          expiry
        ).toLocaleDateString()}`
      );
    }
    return med;
  },

  // Trigger 12: trg_check_stock
  async checkMedicineStock(pharmacyId, medicineId, requiredQty) {
    let stock = null;
    if (pharmacyId) {
      stock = await PharmacyMedicineStock.findOne({
        pharmacy_id: pharmacyId,
        med_id: medicineId,
      });
    }

    if (stock) {
      if (stock.quantity < requiredQty) {
        throw new Error(
          `Trigger [trg_check_stock]: Insufficient stock in pharmacy. Available: ${stock.quantity}, Requested: ${requiredQty}`
        );
      }
    } else {
      const med = await Medicine.findById(medicineId);
      if (med && med.quantity < requiredQty) {
        throw new Error(
          `Trigger [trg_check_stock]: Insufficient stock in inventory. Available: ${med.quantity}, Requested: ${requiredQty}`
        );
      }
    }
  },

  // Add the prescription's medicine charges to the patient's current bill.
  async addPrescriptionCharges(prescriptionDoc) {
    const existingCharges = await MedicineCharge.find({ pres_id: prescriptionDoc._id });
    if (existingCharges.length) {
      return this.recalculateBill(existingCharges[0].bill_id);
    }

    const bill = await this.getOrCreatePendingBill(prescriptionDoc.patient_id);
    for (const item of prescriptionDoc.medicines || []) {
      if (!item.med_id) continue;
      const med = await Medicine.findById(item.med_id);
      if (!med) throw new Error("Medicine not found in catalog");

      const chargeCount = await MedicineCharge.countDocuments();
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? med.unit_price ?? med.unitPrice ?? 10);
      await MedicineCharge.create({
        charge_id: `MC-${String(chargeCount + 1001).padStart(4, "0")}`,
        bill_id: bill._id,
        pres_id: prescriptionDoc._id,
        med_id: med._id,
        medicine_name: item.name || med.name,
        quantity,
        amount: unitPrice * quantity,
      });
    }

    await this.recalculateBill(bill._id);
    return bill;
  },

  async syncPrescriptionCharges(prescriptionDoc) {
    const previousCharges = await MedicineCharge.find({ pres_id: prescriptionDoc._id });
    const affectedBillIds = [...new Set(previousCharges.map((charge) => String(charge.bill_id)))];
    if (previousCharges.length) {
      await MedicineCharge.deleteMany({ pres_id: prescriptionDoc._id });
      for (const billId of affectedBillIds) await this.recalculateBill(billId);
    }
    return this.addPrescriptionCharges(prescriptionDoc);
  },

  // Trigger 13: Reduce inventory after dispense; the prescription charge was
  // added when the doctor wrote the prescription.
  async reduceStockAndCharge(prescriptionDoc, pharmacyId, itemsToDispense) {
    let prescriptionCharges = await MedicineCharge.find({ pres_id: prescriptionDoc._id });
    if (!prescriptionCharges.length) {
      await this.addPrescriptionCharges(prescriptionDoc);
      prescriptionCharges = await MedicineCharge.find({ pres_id: prescriptionDoc._id });
    }

    for (const item of itemsToDispense) {
      const med = await Medicine.findById(item.med_id);
      if (!med) continue;

      // Deduct from pharmacy stock if available, else general stock
      if (pharmacyId) {
        await PharmacyMedicineStock.findOneAndUpdate(
          { pharmacy_id: pharmacyId, med_id: item.med_id },
          { $inc: { quantity: -item.quantity } },
          { upsert: true }
        );
      }
      await Medicine.findByIdAndUpdate(item.med_id, {
        $inc: { quantity: -item.quantity },
      });
    }

    const affectedBillIds = [...new Set(prescriptionCharges.map((charge) => String(charge.bill_id)))];
    for (const billId of affectedBillIds) await this.recalculateBill(billId);
  },

  // ==========================================
  // LABORATORY TRIGGERS (Triggers 14-15)
  // ==========================================

  // Trigger 14: trg_check_lab_technician
  async checkLabTechnician(technicianStaffId) {
    if (!technicianStaffId) return;
    const staff = await MedicalStaff.findById(technicianStaffId);
    if (staff && staff.staff_type !== "Lab Technician") {
      throw new Error(
        `Trigger [trg_check_lab_technician]: Staff member is a '${staff.staff_type}', but only a 'Lab Technician' can conduct diagnostic tests.`
      );
    }
  },

  // Trigger 15: trg_add_test_charge (After Insert)
  async addTestCharge(labTestDoc) {
    const bill = await this.getOrCreatePendingBill(labTestDoc.patient_id);
    let fee = labTestDoc.charge_amount || 0;

    if (!fee && labTestDoc.test_type_id) {
      const type = await TestType.findById(labTestDoc.test_type_id);
      if (type) fee = type.price;
    }
    if (!fee) fee = 300; // default standard test fee

    const chargeCount = await TestCharge.countDocuments();
    await TestCharge.create({
      charge_id: `TC-${String(chargeCount + 1001).padStart(4, "0")}`,
      bill_id: bill._id,
      test_id: labTestDoc._id,
      test_name: labTestDoc.testName,
      amount: fee,
    });

    await this.recalculateBill(bill._id);
  },

  // ==========================================
  // ADMISSION & DISCHARGE TRIGGERS (Triggers 16-23)
  // ==========================================

  // Trigger 16: trg_single_admission (Before Insert)
  async checkSingleAdmission(patientId) {
    const active = await Admission.findOne({
      patient_id: patientId,
      status: "admitted",
    });
    if (active) {
      throw new Error(
        "Trigger [trg_single_admission]: Patient already has an active inpatient admission. Simultaneous active admissions are prohibited."
      );
    }
  },

  // Trigger 17: trg_room_available (Before Insert)
  async checkRoomAvailable(roomId) {
    const room = await Room.findById(roomId);
    if (!room) throw new Error("Room record not found");
    if (room.status !== "available") {
      throw new Error(
        `Trigger [trg_room_available]: Room ${room.room_number || room.bedNumber} is currently '${room.status}'. Must be 'available' to admit.`
      );
    }
    return room;
  },

  // Trigger 18: trg_room_occupied (After Insert)
  async markRoomOccupied(roomId, patientId) {
    await Room.findByIdAndUpdate(roomId, {
      status: "occupied",
      patient: patientId,
    });
    // Mark patient as IPD
    await Patient.findByIdAndUpdate(patientId, { status: "IPD" });
  },

  // Trigger 19: trg_validate_discharge (Before Update)
  validateDischargeDate(admissionDate, dischargeDate) {
    if (new Date(dischargeDate) < new Date(admissionDate)) {
      throw new Error(
        "Trigger [trg_validate_discharge]: Discharge date/time cannot precede admission date/time."
      );
    }
  },

  // Trigger 20: trg_free_room (After Update)
  async freeRoomOnDischarge(roomId, patientId) {
    await Room.findByIdAndUpdate(roomId, {
      status: "available",
      patient: null,
    });
    // Update patient status to Discharged/OPD
    await Patient.findByIdAndUpdate(patientId, { status: "Discharged" });
  },

  // Trigger 21: trg_auto_assign_nurse (Smart Workload Balancing - Pages 2, 29)
  async autoAssignNurse(admissionDoc) {
    // Find all active nurses
    const nurseRecords = await MedicalStaff.find({ staff_type: "Nurse" }).populate("emp_id");
    const nurses = nurseRecords.filter((nurse) => !["resigned", "terminated"].includes(nurse.emp_id?.employment_status));
    if (!nurses || nurses.length === 0) return null;

    // Count active assignments for each nurse
    const nurseLoads = await Promise.all(
      nurses.map(async (nurse) => {
        const count = await NurseAssignment.countDocuments({
          nurse_emp_id: nurse._id,
          active: true,
        });
        return { nurse, count };
      })
    );

    // Sort ascending by current load to pick the nurse with lowest workload
    nurseLoads.sort((a, b) => a.count - b.count);
    const chosen = nurseLoads[0].nurse;

    await NurseAssignment.create({
      admission_id: admissionDoc._id,
      nurse_emp_id: chosen._id,
      assigned_date: new Date(),
      active: true,
    });

    await Admission.findByIdAndUpdate(admissionDoc._id, {
      assigned_nurse: chosen._id,
      nurse_name: chosen.name,
    });

    return chosen;
  },

  // Trigger 22: trg_create_bill_after_admission (After Insert)
  async createBillAfterAdmission(admissionDoc) {
    return await this.getOrCreatePendingBill(admissionDoc.patient_id);
  },

  // Trigger 23: trg_admission_charge (After Update / Discharge)
  async addAdmissionCharge(admissionDoc) {
    const room = await Room.findById(admissionDoc.room_id);
    const dailyRate = room?.daily_rate || 500;

    const admDate = new Date(admissionDoc.admission_date);
    const disDate = new Date(admissionDoc.discharge_date || Date.now());
    const diffTime = Math.max(disDate - admDate, 0);
    const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1); // at least 1 day

    const totalRoomFee = diffDays * dailyRate;

    const bill = await this.getOrCreatePendingBill(admissionDoc.patient_id);
    const chargeCount = await AdmissionCharge.countDocuments();

    await AdmissionCharge.create({
      charge_id: `ADC-${String(chargeCount + 1001).padStart(4, "0")}`,
      bill_id: bill._id,
      adm_id: admissionDoc._id,
      room_number: room?.room_number || "Ward",
      days_stayed: diffDays,
      daily_rate: dailyRate,
      amount: totalRoomFee,
    });

    // Mark nurse assignment as inactive
    await NurseAssignment.updateMany(
      { admission_id: admissionDoc._id },
      { active: false }
    );

    await this.recalculateBill(bill._id);
  },
};
