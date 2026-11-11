import {
  Patient,
  Doctor,
  Appointment,
  Medicine,
  Room,
  Bed,
  Bill,
  Admission,
  MedicalStaff,
} from "../models/index.js";

export const getDashboard = async (req, res) => {
  try {
    const role = req.user?.role || "admin";

    const [
      totalPatients,
      opdPatients,
      ipdPatients,
      totalDoctors,
      scheduledAppointments,
      availableRooms,
      occupiedRooms,
      icuAvailable,
      lowStockMeds,
      expiringMeds,
      billsAggregation,
      pendingBillsCount,
      activeNursesCount,
    ] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ status: "OPD" }),
      Patient.countDocuments({ status: "IPD" }),
      Doctor.countDocuments(),
      Appointment.countDocuments({
        status: "scheduled",
        ...(role === "doctor"
          ? {
              $or: [
                { doctor_emp_id: req.user.emp_id },
                { doctor: req.user.emp_id },
              ],
            }
          : {}),
        ...(role === "patient" ? { patient_id: req.user.patient_id } : {}),
      }),
      Room.countDocuments({ status: "available" }),
      Room.countDocuments({ status: "occupied" }),
      Room.countDocuments({ room_type: "ICU", status: "available" }),
      Medicine.countDocuments({
        $expr: {
          $lte: [
            "$quantity",
            { $ifNull: ["$reorder_level", "$reorderLevel", 15] },
          ],
        },
      }),
      Medicine.countDocuments({
        $or: [
          { expiry_date: { $lte: new Date(Date.now() + 30 * 86400000) } },
          { expiryDate: { $lte: new Date(Date.now() + 30 * 86400000) } },
        ],
      }),
      Bill.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ["$total_amount", "$total", 0] } },
          },
        },
      ]),
      Bill.countDocuments({ status: "pending" }),
      MedicalStaff.countDocuments({ staff_type: "Nurse" }),
    ]);

    const revenue = billsAggregation[0]?.totalRevenue || 0;

    if (role === "patient") return res.json({ appointments: scheduledAppointments });
    if (role === "doctor") {
      return res.json({
        appointments: scheduledAppointments,
        patients: totalPatients,
        opdPatients,
        ipdPatients,
        doctors: totalDoctors,
        availableBeds: availableRooms,
        occupiedBeds: occupiedRooms,
        icuAvailable,
      });
    }
    if (role === "nurse") {
      return res.json({
        patients: totalPatients,
        opdPatients,
        ipdPatients,
        availableBeds: availableRooms,
        occupiedBeds: occupiedRooms,
        icuAvailable,
        activeNurses: activeNursesCount,
      });
    }
    if (role === "pharmacist") return res.json({ lowStock: lowStockMeds, expiringMedicines: expiringMeds });
    if (role === "lab") return res.json({});
    if (role === "accountant") return res.json({ revenue, pendingBills: pendingBillsCount });
    if (role === "receptionist") {
      return res.json({ patients: totalPatients, opdPatients, ipdPatients, doctors: totalDoctors, appointments: scheduledAppointments, pendingBills: pendingBillsCount });
    }

    res.json({
      patients: totalPatients,
      opdPatients,
      ipdPatients,
      doctors: totalDoctors,
      appointments: scheduledAppointments,
      availableBeds: availableRooms,
      occupiedBeds: occupiedRooms,
      icuAvailable,
      lowStock: lowStockMeds,
      expiringMedicines: expiringMeds,
      revenue,
      pendingBills: pendingBillsCount,
      activeNurses: activeNursesCount,
      institution:
        "Maulana Azad National Institute of Technology (MANIT) Bhopal",
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};
