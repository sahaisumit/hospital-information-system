import React from "react";
import { Link } from "react-router-dom";
import ManitBanner from "./ManitBanner";
import useDashboardData from "../../hooks/useDashboardData";
import {
  Users,
  Stethoscope,
  CalendarDays,
  BedDouble,
  Pill,
  Receipt,
  UserCheck,
  FlaskConical,
  Activity,
  ArrowRight,
  UserCircle,
  Plus,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import navItems from "../../config/navigation";

// Build map of allowed roles per route
const routeRolesMap = {};
navItems.forEach(([route, , , roles]) => {
  routeRolesMap[route] = roles;
});

export default function Dashboard() {
  const d = useDashboardData();
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");
  const role = user.role || "patient";

  const isRoleAllowed = (route) => {
    const allowed = routeRolesMap[route];
    return allowed ? allowed.includes(role) : false;
  };

  // Staff / Admin KPI cards
  const allCards = [
    {
      id: "patients",
      title: "Total Patients",
      value: d.patients || 0,
      sub: `${d.opdPatients || 0} OPD • ${d.ipdPatients || 0} Inpatients`,
      icon: Users,
      link: "/patients",
      color: "#1769e0",
      roles: [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
      ],
    },
    {
      id: "doctors",
      title: "Active Doctors",
      value: d.doctors || 0,
      sub: "Across all clinical specialties",
      icon: Stethoscope,
      link: "/doctors",
      color: "#059669",
      roles: [
        "admin",
        "nurse",
        "receptionist",
        "patient",
      ],
    },
    {
      id: "appointments",
      title: role === "patient" ? "My Appointments" : "Appointments Scheduled",
      value: role === "patient" ? "View Active" : d.appointments || 0,
      sub:
        role === "patient"
          ? "Book 30-min consultation slots"
          : "30-minute consultation slots",
      icon: CalendarDays,
      link: "/appointments",
      color: "#d97706",
      roles: ["admin", "doctor", "receptionist", "patient"],
    },
    {
      id: "beds",
      title: "Available Rooms & Beds",
      value: d.availableBeds || 0,
      sub: `${d.occupiedBeds || 0} Occupied • ${d.icuAvailable || 0} ICU Free`,
      icon: BedDouble,
      link: "/beds",
      color: "#7c3aed",
      roles: ["admin", "doctor", "nurse"],
    },
    {
      id: "medicines",
      title: "Pharmacy Stock Alerts",
      value: d.lowStock || 0,
      sub: `${d.expiringMedicines || 0} Expiring soon (Safety Check)`,
      icon: Pill,
      link: "/medicines",
      color: "#dc2626",
      roles: ["admin", "pharmacist"],
    },
    {
      id: "laboratory",
      title: "Laboratory Worklist",
      value: "Open Worklist",
      sub: "Orders and reports for your care team",
      icon: FlaskConical,
      link: "/lab-tests",
      color: "#059669",
      roles: ["admin", "doctor", "lab"],
    },
    {
      id: "bills",
      title:
        role === "patient"
          ? "My Medical Invoices"
          : "Billed Healthcare Revenue",
      value:
        role === "patient"
          ? "View Bills"
          : `₹${(d.revenue || 0).toLocaleString()}`,
      sub:
        role === "patient"
          ? "Consultation & OPD receipts"
          : `${d.pendingBills || 0} Invoices pending payment`,
      icon: Receipt,
      link: "/bills",
      color: "#2563eb",
      roles: ["admin", "receptionist", "accountant", "patient"],
    },
    {
      id: "profile",
      title: role === "patient" ? "My Profile" : "My Profile & Status",
      value: role === "patient" ? "View Profile" : user.is_available !== false ? "● Available" : "● Not Available",
      sub: role === "patient" ? "Manage your personal and medical details" : `Role: ${role.toUpperCase()} • Click to update`,
      icon: UserCircle,
      link: "/profile",
      color: "#0891b2",
      roles: [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab",
        "accountant",
        "patient",
      ],
    },
  ];

  // Filter KPI cards strictly according to user role
  const visibleCards = allCards.filter((c) => c.roles.includes(role));

  // Operational panels
  const allPanels = [
    {
      id: "patient-appointment",
      title: "Book Doctor Consultation ",
      desc: "Select a specialist doctor from available schedules and confirm your 30-minute consultation slot with automatic conflict prevention.",
      link: "/appointments",
      btnText: "Book Consultation Slot",
      icon: CalendarDays,
      color: "#d97706",
      roles: ["patient"],
    },
    {
      id: "patient-doctors",
      title: "Doctor Directory & Live Availability",
      desc: "Check available physicians, specialties, OPD consulting hours, and fees. Live status indicator shows if doctor is currently available or off-duty.",
      link: "/doctors",
      btnText: "Browse Doctors & Schedules",
      icon: Stethoscope,
      color: "#059669",
      roles: ["patient"],
    },
    {
      id: "patient-bills",
      title: "My Invoices & Payment Slips",
      desc: "Access your official outpatient consultation slips, pharmacy bills, and payment records with tax breakdown.",
      link: "/bills",
      btnText: "View Invoices & Receipts",
      icon: Receipt,
      color: "#2563eb",
      roles: ["patient"],
    },
    {
      id: "manage-profile",
      title: "Manage Profile & Duty Availability",
      desc: "Update your personal details, contact numbers, emergency contacts, medical records, and toggle your live duty/availability status.",
      link: "/profile",
      btnText: "Open My Profile",
      icon: UserCircle,
      color: "#0891b2",
      roles: [
        "patient",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab",
        "accountant",
        "admin",
      ],
    },
    {
      id: "patients-admin",
      title: "Patient Administration",
      desc: "Register new patients, manage Outpatient (OPD) and Inpatient (IPD) clinical workflows, and record longitudinal medical histories.",
      link: "/patients",
      btnText: "Patient Records & EMR",
      icon: Users,
      color: "#1769e0",
      roles: [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
      ],
    },
    {
      id: "staff-appointments",
      title: "Appointment Scheduling",
      desc: "Book 30-minute consultation slots with automatic conflict detection, doctor daily quota (max 20/day), and printable slips.",
      link: "/appointments",
      btnText: "Consultation Slots & Slips",
      icon: CalendarDays,
      color: "#d97706",
      roles: ["admin", "doctor", "receptionist"],
    },
    {
      id: "beds-module",
      title: "Inpatient Care & Wards",
      desc: "Real-time room occupancy, ICU allocation, automated nurse workload balancing, and stay duration billing on discharge.",
      link: "/beds",
      btnText: "Room Board & Admissions",
      icon: BedDouble,
      color: "#7c3aed",
      roles: ["admin", "doctor", "nurse"],
    },
    {
      id: "lab-module",
      title: "Laboratory Services",
      desc: "Order standard diagnostic tests (CBC, Lipid, LFT, X-Ray), submit lab findings with technician role verification, and auto-bill charges.",
      link: "/lab-tests",
      btnText: "Diagnostic Tests & Reports",
      icon: FlaskConical,
      color: "#059669",
      roles: ["admin", "doctor", "lab"],
    },
    {
      id: "pharmacy-module",
      title: "Pharmacy",
      desc: "Manage medicine inventory, batch and expiry tracking, prescription dispensing, and stock levels.",
      link: "/medicines",
      btnText: "Pharmacy & Dispensing",
      icon: Pill,
      color: "#dc2626",
      roles: ["admin", "pharmacist"],
    },
    {
      id: "doctor-prescriptions",
      title: "Clinical Prescriptions",
      desc: "Write prescriptions for your confirmed appointments and close the visit when treatment is recorded.",
      link: "/prescriptions",
      btnText: "Open Prescriptions",
      icon: FileText,
      color: "#dc2626",
      roles: ["admin", "doctor"],
    },
    {
      id: "billing-module",
      title: "Consolidated Billing ",
      desc: "Unified billing engine auto-aggregating consultation, pharmacy, laboratory, and room stay charges with official tax invoices.",
      link: "/bills",
      btnText: "Invoices & Payment Receipts",
      icon: Receipt,
      color: "#2563eb",
      roles: ["admin", "receptionist", "accountant"],
    },
    {
      id: "staff-module",
      title: "Hierarchical Staff & Workload ",
      desc: "Employee superclass model with automatic role distribution (Doctor, Medical Staff, Admin) and dynamic nurse workload balancing.",
      link: "/staff",
      btnText: "Staff Directory & Workload",
      icon: UserCheck,
      color: "#0891b2",
      roles: ["admin", "nurse"],
    },
  ];

  // Filter panels strictly according to user role
  const visiblePanels = allPanels.filter((p) => p.roles.includes(role));

  return (
    <div className="mx-auto w-full max-w-screen-2xl mx-auto w-full max-w-screen-2xl">
      {/* MANIT BHOPAL PROJECT BRANDING & SPECIFICATION BANNER */}
      <ManitBanner />

      {/* USER ROLE GREETING & STATUS BANNER */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
        <div className="space-y-1">
          <h2>Welcome, {user.name || "User"}!</h2>
          <p>
            Logged in as{" "}
            <strong className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{role.toUpperCase()}</strong> •
            Hospital Information System
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/profile" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <UserCircle size={15} /> My Profile
          </Link>
          {role === "patient" && (
            <Link to="/appointments" className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Plus size={15} /> Book Appointment
            </Link>
          )}
        </div>
      </div>

      {/* KPI METRICS OVERVIEW: Strictly role-tailored */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link to={c.link} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={i}>
              <div className="mb-2 flex items-start justify-between">
                <small>{c.title}</small>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon size={18} />
                </div>
              </div>
              <strong className="text-2xl font-extrabold leading-tight text-slate-900">{c.value}</strong>
              <span className="mt-1 text-xs text-slate-500">{c.sub}</span>
            </Link>
          );
        })}
      </div>

      {/* OPERATIONAL MODULES / QUICK ACTIONS: Strictly role-tailored */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiblePanels.map((panel) => {
          const Icon = panel.icon;
          return (
            <div key={panel.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <Icon size={20} color={panel.color} />
                <h3 className="text-lg font-semibold text-slate-900">{panel.title}</h3>
              </div>
              <p className="mb-4 flex-1 text-sm leading-6 text-slate-600 mt-2 text-sm leading-6 text-slate-600">{panel.desc}</p>
              <div className="flex justify-end">
                <Link to={panel.link} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-600 hover:text-white">
                  {panel.btnText} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
