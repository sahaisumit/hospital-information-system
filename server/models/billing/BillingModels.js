import mongoose from "mongoose";

const opts = { timestamps: true };

// 23. Bill (Page 26)
// Final receipt and master invoice for a patient's treatment.
export const BillSchema = new mongoose.Schema(
  {
    bill_id: { type: String, unique: true, required: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // alias
    bill_date: { type: Date, default: Date.now },
    total_amount: { type: Number, default: 0, min: [0, "Total amount cannot be negative"] },
    total: { type: Number, default: 0 }, // alias
    amount_paid: { type: Number, default: 0, min: [0, "Paid amount cannot be negative"] },
    status: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
    payment_method: { type: String, default: "Pending" },
    paymentMethod: { type: String }, // alias
    razorpay_order_id: { type: String, index: true },
    razorpay_payment_id: { type: String, index: true },
    razorpay_order_amount: { type: Number, min: 0 }, // Amount in paise, as sent to Razorpay.
    razorpay_orders: [{
      order_id: { type: String, required: true },
      amount: { type: Number, required: true }, // Paise.
      status: { type: String, enum: ["created", "captured"], default: "created" },
      payment_id: { type: String },
      created_at: { type: Date, default: Date.now },
      captured_at: { type: Date },
    }],
    paid_at: { type: Date },
    paidAt: { type: Date }, // alias
    // Breakdown totals for fast reporting
    consultation_charges: { type: Number, default: 0 },
    lab_charges: { type: Number, default: 0 },
    pharmacy_charges: { type: Number, default: 0 },
    room_charges: { type: Number, default: 0 },
    // Backward-compatibility generic items list
    items: [
      {
        description: String,
        category: String,
        amount: Number,
      },
    ],
  },
  opts
);

export const Bill = mongoose.models.Bill || mongoose.model("Bill", BillSchema);

// 24. Appointment_charge (Page 26)
// Consultation fee for a doctor's visit added to the bill.
export const AppointmentChargeSchema = new mongoose.Schema(
  {
    charge_id: { type: String, unique: true, required: true },
    bill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true },
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    consultation_fee: { type: Number, required: true, min: 0 },
  },
  opts
);

export const AppointmentCharge =
  mongoose.models.AppointmentCharge ||
  mongoose.model("AppointmentCharge", AppointmentChargeSchema);

// 25. Medicine_charge (Page 27)
// Cost of pharmaceutical drugs dispensed added to the bill.
export const MedicineChargeSchema = new mongoose.Schema(
  {
    charge_id: { type: String, unique: true, required: true },
    bill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true },
    pres_id: { type: mongoose.Schema.Types.ObjectId, ref: "Prescription" },
    med_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    medicine_name: { type: String },
    quantity: { type: Number, default: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  opts
);

export const MedicineCharge =
  mongoose.models.MedicineCharge || mongoose.model("MedicineCharge", MedicineChargeSchema);

// 26. Test_charge (Page 27)
// Cost of diagnostic lab tests added to the bill.
export const TestChargeSchema = new mongoose.Schema(
  {
    charge_id: { type: String, unique: true, required: true },
    bill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true },
    test_id: { type: mongoose.Schema.Types.ObjectId, ref: "LabTest", required: true },
    test_name: { type: String },
    amount: { type: Number, required: true, min: 0 },
  },
  opts
);

export const TestCharge =
  mongoose.models.TestCharge || mongoose.model("TestCharge", TestChargeSchema);

// 27. Admission_charge (Page 28)
// Stay-related costs (room fees based on length of stay) added to the bill.
export const AdmissionChargeSchema = new mongoose.Schema(
  {
    charge_id: { type: String, unique: true, required: true },
    bill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true },
    adm_id: { type: mongoose.Schema.Types.ObjectId, ref: "Admission", required: true },
    room_number: { type: String },
    days_stayed: { type: Number, default: 1 },
    daily_rate: { type: Number, default: 500 },
    amount: { type: Number, required: true, min: 0 },
  },
  opts
);

export const AdmissionCharge =
  mongoose.models.AdmissionCharge ||
  mongoose.model("AdmissionCharge", AdmissionChargeSchema);
