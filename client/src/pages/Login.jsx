import React from "react";
import useLogin from "../hooks/useLogin";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  LogIn,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from "lucide-react";

const todayLocal = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const demoAccounts = [
  ["Admin", "admin@his.local", "Admin@123", "bg-violet-100 text-violet-700"],
  ["Doctor", "doctor@his.local", "Admin@123", "bg-blue-100 text-blue-700"],
  ["Doctor 15", "doctor15@his.local", "Admin@123", "bg-sky-100 text-sky-700"],
  ["Patient", "patient@his.local", "Admin@123", "bg-rose-100 text-rose-700"],
  ["Nurse", "nurse@his.local", "Admin@123", "bg-teal-100 text-teal-700"],
  ["Reception", "reception@his.local", "Admin@123", "bg-amber-100 text-amber-700"],
  ["Lab", "lab@his.local", "Admin@123", "bg-cyan-100 text-cyan-700"],
  ["Pharmacy", "pharmacist@his.local", "Admin@123", "bg-emerald-100 text-emerald-700"],
  ["Billing", "accounts@his.local", "Admin@123", "bg-indigo-100 text-indigo-700"],
];

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function Login({ onLogin }) {
  const {
    isRegister,
    setIsRegister,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    phone,
    setPhone,
    role,
    setRole,
    gender,
    setGender,
    dob,
    setDob,
    bloodGroup,
    setBloodGroup,
    address,
    setAddress,
    emergencyContact,
    setEmergencyContact,
    err,
    setErr,
    loading,
    submit,
  } = useLogin(onLogin);

  const fillDemo = (demoEmail, demoPass) => {
    setIsRegister(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErr("");
  };

  const changeMode = (register) => {
    setIsRegister(register);
    setErr("");
    if (register) {
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased lg:grid lg:grid-cols-[minmax(0,1.02fr)_minmax(540px,0.98fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
        <div className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 right-[-5rem] h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/40">
            <Activity size={25} strokeWidth={2.6} />
          </div>
          <div>
            <div className="text-base font-bold tracking-wide">MANIT HEALTH</div>
            <div className="text-xs text-slate-400">Hospital Information System</div>
          </div>
        </div>

        <div className="relative my-16 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Connected care, in one place
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            Better coordination for every step of care.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            A shared workspace for patients and hospital teams to manage appointments, clinical records, diagnostics, and day-to-day operations.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              [Stethoscope, "Clinical workflows", "Appointments, prescriptions, and lab results"],
              [HeartPulse, "Patient records", "Care history and inpatient coordination"],
              [ShieldCheck, "Role-based access", "Tools organized around each care team"],
              [CheckCircle2, "Operational overview", "Staff, pharmacy, wards, and billing"],
            ].map(([Icon, title, description]) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-200">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-400">
          <span>MANIT Bhopal</span>
          <span>Hospital Information System</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
        <div className={`w-full ${isRegister ? "max-w-3xl" : "max-w-lg"}`}>
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Activity size={23} strokeWidth={2.6} />
            </div>
            <div>
              <div className="font-bold tracking-wide text-slate-900">MANIT HEALTH</div>
              <div className="text-xs text-slate-500">Hospital Information System</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="mb-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                {isRegister ? "Patient account" : "Welcome back"}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {isRegister ? "Create your account" : "Sign in to your workspace"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isRegister
                  ? "Register as a patient to book appointments and view your records."
                  : "Enter your account details to continue to the hospital portal."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                aria-pressed={!isRegister}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${!isRegister ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                onClick={() => changeMode(false)}
              >
                <LogIn size={16} /> Sign in
              </button>
              <button
                type="button"
                aria-pressed={isRegister}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isRegister ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                onClick={() => changeMode(true)}
              >
                <UserPlus size={16} /> Register
              </button>
            </div>

            <form className="space-y-4 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label]:text-slate-700" onSubmit={submit}>
              {isRegister ? (
                <>
                  <label>
                    Account type
                    <select value={role} onChange={(e) => setRole(e.target.value)} className={`${fieldClass} mt-1.5`}>
                      <option value="patient">Patient</option>
                    </select>
                    <span className="mt-1 block text-xs font-normal text-slate-500">Hospital staff accounts are created by an administrator.</span>
                  </label>

                  <label>
                    Full name
                    <input className={`${fieldClass} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aditi Sharma" autoComplete="name" required />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label>
                      Email address
                      <input className={`${fieldClass} mt-1.5`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                    </label>
                    <label>
                      Phone number
                      <input className={`${fieldClass} mt-1.5`} type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" autoComplete="tel" />
                    </label>
                  </div>

                  <label>
                    Password <span className="font-normal text-slate-500">(at least 6 characters)</span>
                    <input className={`${fieldClass} mt-1.5`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" required minLength={6} />
                  </label>

                  {role === "patient" && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600"><HeartPulse size={18} /></div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Patient details</h3>
                          <p className="mt-0.5 text-xs text-slate-500">Used to create your patient profile.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label>
                          Date of birth
                          <input className={`${fieldClass} mt-1.5`} type="date" max={todayLocal()} value={dob} onChange={(e) => setDob(e.target.value)} required />
                        </label>
                        <label>
                          Gender
                          <select className={`${fieldClass} mt-1.5`} value={gender} onChange={(e) => setGender(e.target.value)}>
                            <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                          </select>
                        </label>
                        <label>
                          Blood group
                          <select className={`${fieldClass} mt-1.5`} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}
                          </select>
                        </label>
                        <label>
                          Emergency contact
                          <input className={`${fieldClass} mt-1.5`} type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit phone number" />
                        </label>
                      </div>
                      <label>
                        Residential address
                        <input className={`${fieldClass} mt-1.5`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" autoComplete="street-address" />
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label>
                    Email address
                    <input className={`${fieldClass} mt-1.5`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="username" required />
                  </label>
                  <label>
                    Password
                    <input className={`${fieldClass} mt-1.5`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                  </label>
                </>
              )}

              {err && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

              <button type="submit" disabled={loading} className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (isRegister ? "Creating account…" : "Signing in…") : (isRegister ? "Create patient account" : "Sign in")}
                {!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            {!isRegister && (
              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Explore with a demo account</div>
                    <div className="mt-0.5 text-xs text-slate-500">Choose a role to fill its sample credentials.</div>
                  </div>
                  <ShieldCheck size={19} className="shrink-0 text-slate-400" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {demoAccounts.map(([label, demoEmail, demoPassword, colors]) => (
                    <button key={label} type="button" onClick={() => fillDemo(demoEmail, demoPassword)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition hover:ring-2 hover:ring-blue-200 ${colors}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Demo accounts use password: <span className="font-semibold text-slate-700">Admin@123</span>.</p>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">MANIT Bhopal · Hospital Information System</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
