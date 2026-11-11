import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  FileText,
  Pill,
  FlaskConical,
  BedDouble,
  Receipt,
  UserCheck,
  UserCircle,
} from "lucide-react";

// A section is shown only to the roles that use that workflow.
const navItems = [
  ["/", "Dashboard", LayoutDashboard, ["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab", "accountant", "patient"]],
  ["/appointments", "Appointments", CalendarDays, ["admin", "doctor", "receptionist", "patient"]],
  ["/prescriptions", "Prescriptions", FileText, ["admin", "doctor", "pharmacist", "patient"]],
  ["/doctors", "Doctors & Specialists", Stethoscope, ["admin", "nurse", "receptionist", "patient"]],
  ["/patients", "Patients", Users, ["admin", "doctor", "nurse", "receptionist"]],
  ["/medicines", "Pharmacy", Pill, ["admin", "pharmacist"]],
  ["/lab-tests", "Laboratory", FlaskConical, ["admin", "doctor", "lab", "patient"]],
  ["/beds", "Inpatient & Wards", BedDouble, ["admin", "doctor", "nurse"]],
  ["/bills", "Billing & Invoices", Receipt, ["admin", "receptionist", "accountant", "patient"]],
  ["/staff", "Staff & Workload", UserCheck, ["admin", "nurse"]],
  ["/profile", "My Profile", UserCircle, ["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab", "accountant", "patient"]],
];

export default navItems;
