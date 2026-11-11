import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import DashboardPage from "../pages/DashboardPage";
import ResourcePage from "../pages/ResourcePage";
import ProfilePage from "../pages/ProfilePage";
import AppShell from "../components/layout/AppShell";

// Specialized clinical module views
import PatientsView from "../components/patients/PatientsView";
import AppointmentsView from "../components/appointments/AppointmentsView";
import PharmacyView from "../components/pharmacy/PharmacyView";
import LaboratoryView from "../components/laboratory/LaboratoryView";
import AdmissionView from "../components/admission/AdmissionView";
import BillingView from "../components/billing/BillingView";
import StaffView from "../components/staff/StaffView";
import PrescriptionsView from "../components/patients/PrescriptionsView";

import { configs } from "../config/resourceConfig";
import navItems from "../config/navigation";
import { api } from "../lib/api";

// Build route permission map from navItems
const routePermissions = {};
navItems.forEach(([path, , , allowedRoles]) => {
  routePermissions[path] = allowedRoles;
});

function ProtectedRoute({ path, user, children }) {
  const allowed = routePermissions[path];
  if (allowed && !allowed.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  const [token, setToken] = useState(() => localStorage.getItem("his_token"));
  const [checkingAuth, setCheckingAuth] = useState(() =>
    Boolean(localStorage.getItem("his_token")),
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("his_user")) || {};
    } catch {
      return {};
    }
  });

  const handleLogin = (newToken) => {
    setToken(newToken);
    try {
      setUser(JSON.parse(localStorage.getItem("his_user")) || {});
    } catch {
      setUser({});
    }
  };

  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    setCheckingAuth(true);
    api("/auth/me")
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        localStorage.setItem("his_user", JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem("his_token");
        localStorage.removeItem("his_user");
        setToken(null);
        setUser({});
      })
      .finally(() => setCheckingAuth(false));
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("his_token");
    localStorage.removeItem("his_user");
    setToken(null);
    setUser({});
  };

  if (checkingAuth)
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">Checking your sign-in…</div>;

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <AppShell onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />

        {/* User Profile Route (All Roles) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute path="/profile" user={user}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Specialized module routes with strict role authorization */}
        <Route
          path="/patients"
          element={
            <ProtectedRoute path="/patients" user={user}>
              <PatientsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute path="/appointments" user={user}>
              <AppointmentsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <ProtectedRoute path="/prescriptions" user={user}>
              <PrescriptionsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines"
          element={
            <ProtectedRoute path="/medicines" user={user}>
              <PharmacyView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab-tests"
          element={
            <ProtectedRoute path="/lab-tests" user={user}>
              <LaboratoryView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/beds"
          element={
            <ProtectedRoute path="/beds" user={user}>
              <AdmissionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bills"
          element={
            <ProtectedRoute path="/bills" user={user}>
              <BillingView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute path="/staff" user={user}>
              <StaffView />
            </ProtectedRoute>
          }
        />

        {/* Doctors & Fallback Routes */}
        <Route
          path="/doctors"
          element={
            <ProtectedRoute path="/doctors" user={user}>
              <ResourcePage type="doctors" />
            </ProtectedRoute>
          }
        />

        {Object.keys(configs).map((k) => {
          if (
            [
              "patients",
              "appointments",
              "prescriptions",
              "medicines",
              "lab-tests",
              "beds",
              "bills",
              "doctors",
            ].includes(k)
          ) {
            return null;
          }
          return (
            <Route
              key={k}
              path={"/" + k}
              element={
                <ProtectedRoute path={"/" + k} user={user}>
                  <ResourcePage type={k} />
                </ProtectedRoute>
              }
            />
          );
        })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default AppRoutes;
