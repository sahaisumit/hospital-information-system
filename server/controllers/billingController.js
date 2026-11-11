import mongoose from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  Bill,
  AppointmentCharge,
  MedicineCharge,
  TestCharge,
  AdmissionCharge,
  Patient,
  Appointment,
} from "../models/index.js";
import { TriggerEngine } from "../services/triggerEngine.js";

const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const assertBillAccess = async (req, bill) => {
  if (req.user?.role !== "patient") return;
  let patientId = req.user.patient_id;
  if (!patientId) patientId = (await Patient.findOne({ user_id: req.user.id }))?._id;
  if (String(bill.patient_id) !== String(patientId)) {
    const error = new Error("You can only pay your own bills");
    error.status = 403;
    throw error;
  }
};

const assertNoUnpaidCashAppointment = async (bill) => {
  const cashCharge = await AppointmentCharge.findOne({ bill_id: bill._id });
  if (!cashCharge) return;
  const cashAppointment = await Appointment.findById(cashCharge.appointment_id);
  if (cashAppointment?.payment_method === "Cash" && cashAppointment.payment_status !== "paid") {
    const error = new Error("Cash appointments must be settled by staff using the cash receipt workflow");
    error.status = 400;
    throw error;
  }
};

const razorpayRequest = async (path, method = "GET", body) => {
  const authorization = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${authorization}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.description || "Razorpay request failed");
    error.status = response.status;
    throw error;
  }
  return result;
};

const settleCapturedPayment = async (bill, payment) => {
  const order = bill.razorpay_orders?.find((item) => item.order_id === payment.order_id);
  if (!order) return { ok: false, reason: "Order is not linked to this invoice" };
  if (payment.status !== "captured" || payment.currency !== "INR" || Number(payment.amount) !== Number(order.amount)) {
    return { ok: false, reason: "Payment is not captured for the expected invoice amount" };
  }
  if (order.status === "captured") {
    return { ok: bill.status === "paid", bill };
  }

  const totalAmount = Number(bill.total_amount || bill.total || 0);
  const paidBefore = Number(bill.amount_paid || 0);
  const paidAfter = paidBefore + Number(payment.amount) / 100;
  const nextStatus = paidAfter >= totalAmount ? "paid" : "partial";
  const updated = await Bill.findOneAndUpdate(
    {
      _id: bill._id,
      status: { $ne: "paid" },
      total_amount: bill.total_amount,
      amount_paid: bill.amount_paid || 0,
      razorpay_orders: { $elemMatch: { order_id: payment.order_id, status: "created" } },
    },
    {
      $set: {
        status: nextStatus,
        payment_method: "Razorpay",
        paymentMethod: "Razorpay",
        paid_at: nextStatus === "paid" ? new Date() : bill.paid_at,
        paidAt: nextStatus === "paid" ? new Date() : bill.paidAt,
        razorpay_payment_id: payment.id,
        "razorpay_orders.$.status": "captured",
        "razorpay_orders.$.payment_id": payment.id,
        "razorpay_orders.$.captured_at": new Date(),
      },
      $inc: { amount_paid: Number(payment.amount) / 100 },
    },
    { new: true },
  );
  if (updated) {
    if (updated.status === "paid") {
      const charges = await AppointmentCharge.find({ bill_id: updated._id }).select("appointment_id");
      const appointmentIds = charges.map((charge) => charge.appointment_id);
      if (appointmentIds.length) {
        await Appointment.updateMany(
          { _id: { $in: appointmentIds }, payment_status: "pending" },
          { $set: { payment_status: "paid", payment_method: "Razorpay", payment_reference: payment.id } },
        );
      }
    }
    return { ok: updated.status === "paid", bill: updated };
  }
  const latest = await Bill.findById(bill._id);
  return { ok: latest?.status === "paid" && latest.razorpay_payment_id === payment.id, bill: latest };
};

export const getBills = async (req, res) => {
  try {
    const { status, patient } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (patient) filter.patient_id = patient;
    if (req.user?.role === "patient") {
      let patientId = req.user.patient_id;
      if (!patientId) patientId = (await Patient.findOne({ user_id: req.user.id }))?._id;
      if (!patientId) return res.json([]);
      filter.patient_id = patientId;
    }

    const list = await Bill.find(filter)
      .populate("patient_id")
      .populate("patient")
      .sort({ bill_date: -1 });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("patient_id")
      .populate("patient");

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (req.user?.role === "patient") {
      let patientId = req.user.patient_id;
      if (!patientId) patientId = (await Patient.findOne({ user_id: req.user.id }))?._id;
      if (String(bill.patient_id?._id || bill.patient_id) !== String(patientId)) return res.status(403).json({ message: "You can only view your own bills" });
    }

    // Always fetch freshest itemized charges
    const [apptCharges, medCharges, testCharges, admCharges] = await Promise.all([
      AppointmentCharge.find({ bill_id: bill._id }).populate("appointment_id"),
      MedicineCharge.find({ bill_id: bill._id }).populate("med_id"),
      TestCharge.find({ bill_id: bill._id }).populate("test_id"),
      AdmissionCharge.find({ bill_id: bill._id }).populate("adm_id"),
    ]);

    const safeTestCharges = testCharges.map((charge) => {
      const item = charge.toObject();
      if (item.test_id) {
        delete item.test_id.report_file_data;
        if (req.user?.role === "patient" && bill.status !== "paid") {
          item.test_id.result = undefined;
          item.test_id.notes = undefined;
          item.test_id.report_file_name = undefined;
          item.test_id.report_file_type = undefined;
          item.test_id.completedAt = undefined;
        }
      }
      return item;
    });

    res.json({
      bill,
      breakdown: {
        appointmentCharges: apptCharges,
        medicineCharges: medCharges,
        testCharges: safeTestCharges,
        admissionCharges: admCharges,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    if (!razorpayConfigured()) return res.status(503).json({ message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment." });
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    await assertBillAccess(req, bill);
    await assertNoUnpaidCashAppointment(bill);
    if (bill.status === "paid") return res.status(409).json({ message: "This invoice has already been paid." });

    const dueRupees = Math.max(0, Number(bill.total_amount || bill.total || 0) - Number(bill.amount_paid || 0));
    const duePaise = Math.round(dueRupees * 100);
    if (!Number.isSafeInteger(duePaise) || duePaise <= 0) return res.status(400).json({ message: "This invoice has no payable balance." });

    // Reuse an open order so retries do not create avoidable duplicate payment attempts.
    const openOrder = bill.razorpay_orders?.find((order) => order.status === "created");
    if (openOrder) {
      if (openOrder.amount > duePaise) return res.status(409).json({ message: "The invoice changed after a payment order was created. Contact billing before retrying payment." });
      return res.json({ key_id: process.env.RAZORPAY_KEY_ID, order_id: openOrder.order_id, amount: openOrder.amount, currency: "INR" });
    }

    const gatewayOrder = await razorpayRequest("/orders", "POST", {
      amount: duePaise,
      currency: "INR",
      receipt: `B${bill._id.toString().slice(-10)}${Date.now()}`,
      notes: { bill_id: bill.bill_id },
    });
    bill.razorpay_orders.push({ order_id: gatewayOrder.id, amount: gatewayOrder.amount, status: "created" });
    bill.razorpay_order_id = gatewayOrder.id;
    bill.razorpay_order_amount = gatewayOrder.amount;
    await bill.save();

    res.status(201).json({ key_id: process.env.RAZORPAY_KEY_ID, order_id: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency || "INR" });
  } catch (err) {
    res.status(err.status || 502).json({ message: err.status ? err.message : "Unable to create a Razorpay order. Check the server keys and Razorpay account settings." });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!razorpayConfigured()) return res.status(503).json({ message: "Razorpay is not configured on the server." });
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (![orderId, paymentId, signature].every((value) => typeof value === "string" && value.length > 0)) return res.status(400).json({ message: "Razorpay payment verification fields are required." });

    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    await assertBillAccess(req, bill);
    const order = bill.razorpay_orders?.find((item) => item.order_id === orderId);
    if (!order) return res.status(400).json({ message: "This Razorpay order does not belong to the invoice." });

    const expectedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    const expectedBytes = Buffer.from(expectedSignature, "hex");
    const providedBytes = Buffer.from(signature, "hex");
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) return res.status(400).json({ message: "Razorpay signature verification failed." });

    let payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId) return res.status(400).json({ message: "Payment does not match this invoice order." });
    if (payment.status === "authorized" && Number(payment.amount) === Number(order.amount) && payment.currency === "INR") {
      payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, "POST", { amount: payment.amount, currency: payment.currency });
    }
    const settled = await settleCapturedPayment(bill, payment);
    if (!settled.ok) return res.status(409).json({ message: "Payment was not captured for the full invoice balance. The invoice remains unpaid until captured funds cover its balance." });
    res.json({ message: "Razorpay payment verified. Invoice marked paid.", bill: settled.bill });
  } catch (err) {
    res.status(err.status || 502).json({ message: err.status ? err.message : "Unable to verify the Razorpay payment. Check the payment status and try again." });
  }
};

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    if (!webhookSecret) return res.status(503).json({ message: "Razorpay webhook is not configured." });
    if (!req.rawBody || typeof signature !== "string") return res.status(400).json({ message: "Invalid webhook request." });
    const expected = createHmac("sha256", webhookSecret).update(req.rawBody).digest("hex");
    const expectedBytes = Buffer.from(expected, "hex");
    const providedBytes = Buffer.from(signature, "hex");
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) return res.status(400).json({ message: "Invalid webhook signature." });

    const event = req.body?.event;
    if (!["payment.captured", "order.paid"].includes(event)) return res.json({ received: true });
    const payment = req.body?.payload?.payment?.entity;
    if (!payment?.order_id || !payment?.id) return res.json({ received: true });
    const bill = await Bill.findOne({ "razorpay_orders.order_id": payment.order_id });
    if (!bill) return res.json({ received: true });
    const settled = await settleCapturedPayment(bill, payment);
    if (!settled.ok && settled.reason) return res.status(400).json({ message: settled.reason });
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ message: "Webhook processing failed." });
  }
};

// DFD 12: Generate Final Bill Receipt
export const getBillReceipt = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("patient_id")
      .populate("patient");

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (req.user?.role === "patient") {
      let patientId = req.user.patient_id;
      if (!patientId) patientId = (await Patient.findOne({ user_id: req.user.id }))?._id;
      if (String(bill.patient_id?._id || bill.patient_id) !== String(patientId)) return res.status(403).json({ message: "You can only view your own receipt" });
    }

    const [apptCharges, medCharges, testCharges, admCharges] = await Promise.all([
      AppointmentCharge.find({ bill_id: bill._id }),
      MedicineCharge.find({ bill_id: bill._id }),
      TestCharge.find({ bill_id: bill._id }),
      AdmissionCharge.find({ bill_id: bill._id }),
    ]);

    const patient = bill.patient_id || bill.patient;

    res.json({
      institution: "Maulana Azad National Institute of Technology (MANIT) Bhopal",
      department: "Consolidated Healthcare Billing & Accounts",
      receiptNo: `RCT-${bill.bill_id}`,
      billId: bill.bill_id,
      billDate: bill.bill_date,
      paymentStatus: bill.status,
      paymentMethod: bill.payment_method || "Pending",
      paidAt: bill.paid_at,
      patientDetails: {
        name: patient?.name || "Patient",
        id: patient?.patient_id || "PAT-N/A",
        phone: patient?.phone || "N/A",
        address: patient?.address || "N/A",
      },
      itemizedCharges: {
        consultations: apptCharges.map((c) => ({
          desc: `Consultation Fee (${c.charge_id})`,
          amount: c.consultation_fee,
        })),
        pharmacy: medCharges.map((c) => ({
          desc: `${c.medicine_name || "Prescribed Medicine"} (Qty: ${c.quantity})`,
          amount: c.amount,
        })),
        laboratory: testCharges.map((c) => ({
          desc: `Diagnostic Test: ${c.test_name || "Diagnostic Panel"}`,
          amount: c.amount,
        })),
        inpatientStay: admCharges.map((c) => ({
          desc: `Room Stay: ${c.room_number || "Ward"} (${c.days_stayed} days @ ₹${c.daily_rate}/day)`,
          amount: c.amount,
        })),
      },
      totals: {
        consultationTotal: bill.consultation_charges || 0,
        pharmacyTotal: bill.pharmacy_charges || 0,
        labTotal: bill.lab_charges || 0,
        roomTotal: bill.room_charges || 0,
        grandTotal: bill.total_amount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
