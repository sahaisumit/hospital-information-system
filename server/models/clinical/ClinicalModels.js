import mongoose from "mongoose";

const opts = { timestamps: true };

// 12. Appointment (Page 20)
// Scheduled sessions for consultation between patients and doctors (30 min duration).
export const AppointmentSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, unique: true, required: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // backward-compatibility alias
    doctor_emp_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }, // backward-compatibility alias
    appointment_date: { type: Date, required: true },
    date: { type: Date }, // backward-compatibility alias
    start_time: { type: String, required: true, default: "10:00" }, // e.g. "10:00"
    end_time: { type: String, required: true, default: "10:30" }, // e.g. "10:30" (Duration = 30m)
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    reason: { type: String },
    notes: { type: String },
    consultation_fee: { type: Number, default: 500 },
    payment_status: { type: String, enum: ["pending", "paid"], default: "pending" },
    payment_method: { type: String, default: "" },
    payment_reference: { type: String, default: "" },
    payment_bill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
    slip_generated: { type: Boolean, default: false },
  },
  opts
);

export const Appointment =
  mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);

// 21. Prescription (Page 25)
// A doctor's official order for patient medication.
export const PrescriptionSchema = new mongoose.Schema(
  {
    pres_id: { type: String, unique: true, required: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // alias
    doctor_emp_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }, // alias
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    pharmacy_id: { type: mongoose.Schema.Types.ObjectId, ref: "Pharmacy" },
    prescription_date: { type: Date, default: Date.now },
    instructions: { type: String },
    status: {
      type: String,
      enum: ["prescribed", "dispensed", "cancelled"],
      default: "prescribed",
    },
    // Keep embedded medicines list for quick UI rendering and legacy compatibility
    medicines: [
      {
        med_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        quantity: { type: Number, default: 1 },
        unit_price: Number,
      },
    ],
  },
  opts
);

export const Prescription =
  mongoose.models.Prescription || mongoose.model("Prescription", PrescriptionSchema);

// 22. Prescription_medicine (Page 25)
// Detailed drug list and dosage for a specific prescription.
export const PrescriptionMedicineSchema = new mongoose.Schema(
  {
    pres_id: { type: mongoose.Schema.Types.ObjectId, ref: "Prescription", required: true },
    med_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    quantity: { type: Number, required: true, min: [1, "Quantity must be at least 1"] },
    dosage: { type: String, required: true }, // frequency (e.g. 1x day)
  },
  opts
);

export const PrescriptionMedicine =
  mongoose.models.PrescriptionMedicine ||
  mongoose.model("PrescriptionMedicine", PrescriptionMedicineSchema);
