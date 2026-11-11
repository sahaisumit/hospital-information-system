import {
  Appointment,
  Doctor,
  Patient,
  AppointmentCharge,
  Bill,
} from "../models/index.js";
import { TriggerEngine } from "../services/triggerEngine.js";

// Standard 30-minute consultation slots (09:00 to 17:00)
export const STANDARD_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

export const getAppointments = async (req, res) => {
  try {
    const { doctor, date, patient } = req.query;
    let filter = {};

    // Patient role isolation: patients only see their own appointments
    if (req.user?.role === "patient") {
      let patientDoc = null;
      if (req.user.patient_id) {
        patientDoc = await Patient.findById(req.user.patient_id);
      }
      if (!patientDoc) {
        patientDoc = await Patient.findOne({
          $or: [{ user_id: req.user.id }, { email: req.user.email }],
        });
      }

      if (patientDoc) {
        filter.$or = [
          { patient_id: patientDoc._id },
          { patient: patientDoc._id },
        ];
      } else {
        return res.json([]);
      }
    } else if (req.user?.role === "doctor") {
      if (!req.user.emp_id) return res.json([]);
      filter.$or = [
        { doctor_emp_id: req.user.emp_id },
        { doctor: req.user.emp_id },
      ];
    } else {
      if (doctor) filter.doctor_emp_id = doctor;
      if (patient) filter.patient_id = patient;
    }

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(new Date(d).setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(d).setUTCHours(23, 59, 59, 999));
      filter.appointment_date = { $gte: startOfDay, $lte: endOfDay };
    }

    const list = await Appointment.find(filter)
      .populate("patient_id")
      .populate("doctor_emp_id")
      .populate("patient")
      .populate("doctor")
      .sort({ appointment_date: -1, start_time: 1 });

    const charges = await AppointmentCharge.find({ appointment_id: { $in: list.map((item) => item._id) } }).select("appointment_id bill_id");
    const billByAppointment = new Map(charges.map((charge) => [String(charge.appointment_id), charge.bill_id]));
    const billIds = [...new Set(charges.map((charge) => String(charge.bill_id)))];
    const billList = billIds.length ? await Bill.find({ _id: { $in: billIds } }).select("total_amount total amount_paid") : [];
    const billDueById = new Map(billList.map((bill) => [String(bill._id), Math.max(0, Number(bill.total_amount || bill.total || 0) - Number(bill.amount_paid || 0))]));
    res.json(list.map((item) => {
      const billId = item.payment_bill_id || billByAppointment.get(String(item._id));
      return { ...item.toObject(), payment_bill_id: billId, payment_bill_amount_due: billId ? billDueById.get(String(billId)) : undefined };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();

    const docRecord = await Doctor.findById(doctorId);
    const isDocAvailable = docRecord?.is_available ?? true;
    const statusNote = docRecord?.status_note || "Available";

    // If doctor is marked Not Available
    if (!isDocAvailable) {
      const allUnavailableSlots = STANDARD_SLOTS.map((slot) => ({
        start_time: slot,
        end_time: slot.endsWith("00")
          ? slot.replace("00", "30")
          : `${String(Number(slot.split(":")[0]) + 1).padStart(2, "0")}:00`,
        available: false,
      }));

      return res.json({
        doctorId,
        doctorName: docRecord?.name,
        is_available: false,
        status_note: statusNote,
        date: queryDate,
        totalBooked: 0,
        maxAllowed: 20,
        slots: allUnavailableSlots,
        message: `Doctor ${docRecord?.name || ""} is currently marked as Not Available (${statusNote}).`,
      });
    }

    const startOfDay = new Date(new Date(queryDate).setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(queryDate).setUTCHours(23, 59, 59, 999));

    const booked = await Appointment.find({
      $and: [
        { $or: [{ doctor_emp_id: doctorId }, { doctor: doctorId }] },
        {
          $or: [
            { appointment_date: { $gte: startOfDay, $lte: endOfDay } },
            {
              $and: [
                {
                  $or: [
                    { appointment_date: { $exists: false } },
                    { appointment_date: null },
                  ],
                },
                { date: { $gte: startOfDay, $lte: endOfDay } },
              ],
            },
          ],
        },
        { status: { $ne: "cancelled" } },
      ],
    });

    const bookedSlots = booked.map((a) => a.start_time);
    const slots = STANDARD_SLOTS.map((slot) => {
      const isBooked = bookedSlots.includes(slot);
      return {
        start_time: slot,
        end_time: slot.endsWith("00")
          ? slot.replace("00", "30")
          : `${String(Number(slot.split(":")[0]) + 1).padStart(2, "0")}:00`,
        available: !isBooked,
      };
    });

    res.json({
      doctorId,
      doctorName: docRecord?.name,
      is_available: true,
      status_note: statusNote,
      date: queryDate,
      totalBooked: booked.length,
      maxAllowed: 20, // Trigger 9
      slots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createAppointment = async (req, res) => {
  try {
    let {
      patient_id,
      patient,
      doctor_emp_id,
      doctor,
      appointment_date,
      date,
      start_time,
      reason,
      payment_method,
      payment_amount,
    } = req.body;

    // If booking user is a patient, enforce their own patient profile
    if (req.user?.role === "patient") {
      let patientDoc = null;
      if (req.user.patient_id) {
        patientDoc = await Patient.findById(req.user.patient_id);
      }
      if (!patientDoc) {
        patientDoc = await Patient.findOne({
          $or: [{ user_id: req.user.id }, { email: req.user.email }],
        });
      }

      if (!patientDoc) {
        const count = await Patient.countDocuments();
        const genId = `PAT-${String(count + 1001).padStart(4, "0")}`;
        patientDoc = await Patient.create({
          patient_id: genId,
          patientId: genId,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || "",
          gender: "Other",
          user_id: req.user.id,
        });
      }

      patient_id = patientDoc._id;
      patient = patientDoc._id;
    }

    const actualPatientId = patient_id || patient;
    const actualDoctorId = doctor_emp_id || doctor;
    const actualDate = appointment_date || date;
    const slotStart = start_time || "10:00";

    if (
      typeof actualDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(actualDate) ||
      Number.isNaN(Date.parse(`${actualDate}T00:00:00.000Z`)) ||
      new Date(`${actualDate}T00:00:00.000Z`).toISOString().slice(0, 10) !==
        actualDate
    ) {
      return res
        .status(400)
        .json({ message: "Choose a valid appointment date" });
    }
    if (!STANDARD_SLOTS.includes(slotStart)) {
      return res
        .status(400)
        .json({
          message: "Choose one of the available 30-minute appointment slots",
        });
    }

    if (!actualDoctorId) {
      return res
        .status(400)
        .json({ message: "Please select a consulting doctor" });
    }

    // Verify doctor availability status
    const docRecord = await Doctor.findById(actualDoctorId);
    if (!docRecord) {
      return res.status(404).json({ message: "Selected doctor not found" });
    }

    const consultationFee =
      docRecord.consultation_fee ?? docRecord.consultationFee ?? 500;
    const payingCashAtReception = payment_method === "Cash";
    if (
      !["Razorpay", "Cash"].includes(payment_method) ||
      Number(payment_amount) !== Number(consultationFee)
    ) {
      return res.status(402).json({
        message: `Pay the consultation fee of ₹${consultationFee} before confirming this appointment`,
        consultation_fee: consultationFee,
      });
    }

    // A doctor may only create bookings for their own schedule.
    if (
      req.user?.role === "doctor" &&
      String(req.user.emp_id) !== String(actualDoctorId)
    ) {
      return res
        .status(403)
        .json({
          message: "Doctors can only book appointments on their own schedule",
        });
    }

    if (docRecord.is_available === false) {
      return res.status(400).json({
        message: `Dr. ${docRecord.name} is currently marked as Not Available (${docRecord.status_note || "Off-duty"}). Please select another doctor or another day.`,
      });
    }

    // Compute 30 min end time
    const [h, m] = slotStart.split(":").map(Number);
    let endH = h;
    let endM = m + 30;
    if (endM >= 60) {
      endH += 1;
      endM -= 60;
    }
    const slotEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // RUN TRIGGERS 7, 8, 9
    try {
      TriggerEngine.validateAppointmentDate(actualDate, slotStart);
      await TriggerEngine.checkDoctorScheduleOverlap(
        actualDoctorId,
        actualDate,
        slotStart,
      );
      await TriggerEngine.checkDoctorDailyLimit(actualDoctorId, actualDate);
    } catch (error) {
      return res.status(409).json({ message: error.message });
    }

    const count = await Appointment.countDocuments();
    const appointment_id =
      req.body.appointment_id || `APT-${String(count + 1001).padStart(4, "0")}`;

    const newAppointment = await Appointment.create({
      appointment_id,
      patient_id: actualPatientId,
      patient: actualPatientId,
      doctor_emp_id: actualDoctorId,
      doctor: actualDoctorId,
      appointment_date: actualDate,
      date: actualDate,
      start_time: slotStart,
      end_time: slotEnd,
      status: "scheduled",
      reason: reason || "General Consultation",
      consultation_fee: consultationFee,
      payment_status: "pending",
      payment_method,
      payment_reference: "",
    });

    // RUN TRIGGER 10: Automatically add consultation charge to patient bill
    await TriggerEngine.addAppointmentCharge(newAppointment);
    const appointmentCharge = await AppointmentCharge.findOne({ appointment_id: newAppointment._id });
    if (appointmentCharge?.bill_id) {
      newAppointment.payment_bill_id = appointmentCharge.bill_id;
      await newAppointment.save();
    }

    const populated = await Appointment.findById(newAppointment._id)
      .populate("patient_id")
      .populate("doctor_emp_id");

    res.status(201).json({ ...populated.toObject(), payment_bill_id: appointmentCharge?.bill_id || undefined });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const collectCashPayment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });
    if (appointment.payment_status === "paid")
      return res
        .status(409)
        .json({ message: "This appointment is already paid" });
    if (appointment.payment_method !== "Cash")
      return res
        .status(400)
        .json({
          message: "Cash collection is only available for cash bookings",
        });

    const charge = await AppointmentCharge.findOne({
      appointment_id: appointment._id,
    });
    if (!charge)
      return res
        .status(404)
        .json({ message: "Appointment charge was not found" });
    const amount = Number(req.body.amount);
    if (
      !Number.isFinite(amount) ||
      amount !== Number(charge.consultation_fee)
    ) {
      return res
        .status(400)
        .json({
          message: `Enter the exact consultation amount of ₹${charge.consultation_fee}`,
        });
    }
    const receiptNumber = String(req.body.receipt_number || "").trim();
    if (!receiptNumber)
      return res
        .status(400)
        .json({ message: "Cash receipt number is required" });

    const bill = await Bill.findById(charge.bill_id);
    if (!bill)
      return res.status(404).json({ message: "Patient invoice was not found" });
    const alreadyPaid = Number(bill.amount_paid || 0);
    const newPaidAmount = alreadyPaid + amount;
    if (newPaidAmount > Number(bill.total_amount || bill.total || 0)) {
      return res
        .status(400)
        .json({
          message: "Cash amount exceeds the remaining balance on this invoice",
        });
    }

    bill.amount_paid = newPaidAmount;
    bill.status =
      newPaidAmount >= Number(bill.total_amount || bill.total || 0)
        ? "paid"
        : "partial";
    bill.payment_method = "Cash";
    bill.paymentMethod = "Cash";
    if (bill.status === "paid") {
      bill.paid_at = new Date();
      bill.paidAt = bill.paid_at;
    }
    await bill.save();

    const paidAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        payment_status: "pending",
        payment_method: "Cash",
      },
      { $set: { payment_status: "paid", payment_reference: receiptNumber } },
      { new: true },
    );
    if (!paidAppointment)
      return res
        .status(409)
        .json({
          message: "Cash payment was already recorded by another staff member",
        });

    res.json({
      message: `Cash payment of ₹${amount} recorded. Receipt ${receiptNumber}.`,
      appointment: paidAppointment,
      bill,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DFD Page 9: Generate Appointment Confirmation Slip
export const getAppointmentSlip = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate("patient_id")
      .populate("doctor_emp_id")
      .populate("doctor");

    if (!appt)
      return res.status(404).json({ message: "Appointment not found" });

    if (
      req.user?.role === "doctor" &&
      String(
        appt.doctor_emp_id?._id ||
          appt.doctor_emp_id ||
          appt.doctor?._id ||
          appt.doctor,
      ) !== String(req.user.emp_id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only view slips for your appointments" });
    }
    if (
      req.user?.role === "patient" &&
      String(appt.patient_id?._id || appt.patient_id) !==
        String(req.user.patient_id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only view your own appointment slip" });
    }

    res.json({
      institution:
        "Maulana Azad National Institute of Technology (MANIT) Bhopal",
      title: "APPOINTMENT CONFIRMATION SLIP",
      slipNo: `SLIP-${appt.appointment_id}`,
      appointmentDate: appt.appointment_date,
      timeSlot: `${appt.start_time} - ${appt.end_time} (30 mins)`,
      patientName: appt.patient_id?.name,
      patientId: appt.patient_id?.patient_id,
      doctorName: appt.doctor_emp_id?.name || appt.doctor?.name,
      department: appt.doctor_emp_id?.department || appt.doctor?.department,
      consultationFee: appt.consultation_fee,
      status: appt.status,
      paymentStatus: appt.payment_status,
      paymentMethod: appt.payment_method,
      paymentReference: appt.payment_reference,
      instructions:
        "Please report to the reception 15 minutes before your scheduled slot.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
