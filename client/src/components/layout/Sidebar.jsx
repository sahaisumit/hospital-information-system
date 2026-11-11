import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import navItems from "../../config/navigation";

function Sidebar({ open, setOpen, user, onLogout }) {
  const loc = useLocation();
  const nav = useNavigate();

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[250px] -translate-x-full flex-col border-r border-slate-200 bg-white px-3 py-5 shadow-sm transition-transform duration-200 md:translate-x-0 ${open ? "!translate-x-0" : ""}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 pb-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-2xl font-bold text-white">+</span>

        <div>
          <b>MANIT — HIS</b>
          <small>Digital Health System</small>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
        {navItems
          .filter(([, , , allowedRoles]) => allowedRoles.includes(user.role))
          .map(([to, label, Icon]) => (
            <Link
              key={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${loc.pathname === to ? "border-blue-600 bg-blue-50 text-blue-700 bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              to={to}
            >
              <Icon size={19} />
              {user.role === "patient" && to === "/lab-tests" ? "Lab Reports" : label}
            </Link>
          ))}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4 mt-auto border-t border-slate-100 pt-4">
        <Link
          to="/profile"
          className="mb-3 flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 cursor-pointer no-underline transition hover:bg-slate-50 mb-3 flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50"
          onClick={() => setOpen(false)}
          title={user.role === "patient" ? "Manage My Profile" : "Manage My Profile & Availability"}
        >
          <div className="relative inline-block">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">{user.name?.[0] || "A"}</div>
            {user.role !== "patient" && <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${user.is_available !== false ? "bg-emerald-500" : "bg-red-500"}`}
              title={user.is_available !== false ? "Status: Available" : "Status: Not Available"}
            />}
          </div>

          <div>
            <b className="block">{user.name || "User"}</b>
            <small className="block">
              {user.role === "patient" ? "Patient" : `${user.role || "staff"} • ${user.is_available !== false ? "Available" : "Away"}`}
            </small>
          </div>
        </Link>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          onClick={() => {
            localStorage.removeItem("his_token");
            localStorage.removeItem("his_user");
            onLogout();
            nav("/login");
          }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
