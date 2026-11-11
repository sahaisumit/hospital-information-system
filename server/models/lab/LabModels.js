import mongoose from "mongoose";

const opts = { timestamps: true };

// 15. Test_type (Page 22)
// Catalog of available lab tests and their standard prices.
export const TestTypeSchema = new mongoose.Schema(
  {
    test_type_id: { type: String, unique: true, required: true },
    test_name: { type: String, unique: true, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: "Pathology" },
    normal_range: { type: String, default: "Standard" },
  },
  opts
);

export const TestType = mongoose.models.TestType || mongoose.model("TestType", TestTypeSchema);

// 16. Lab_test (Page 22)
// Results and details of tests performed on patients.
export const LabTestSchema = new mongoose.Schema(
  {
    test_id: { type: String, unique: true, required: true },
    test_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "TestType" },
    testName: { type: String, required: true }, // backward-compatibility alias
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // backward-compatibility alias
    doctor_emp_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }, // backward-compatible alias
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    medicalstaff_emp_id: { type: mongoose.Schema.Types.ObjectId, ref: "MedicalStaff" }, // Lab Tech
    technician_name: { type: String },
    test_date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["ordered", "processing", "completed", "cancelled"],
      default: "ordered",
    },
    result: { type: String },
    report_file_name: { type: String },
    report_file_type: { type: String },
    report_file_data: { type: String },
    normal_range: { type: String },
    notes: { type: String },
    charge_amount: { type: Number, default: 0 },
    orderedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  opts
);

export const LabTest = mongoose.models.LabTest || mongoose.model("LabTest", LabTestSchema);
