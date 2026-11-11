import { Activity } from "lucide-react";

export default function ManitBanner() {
  return (
    <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <Activity size={28} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
            Hospital Information System
          </p>
          <h1 className="my-1 text-2xl font-extrabold text-slate-900">
            Integrated Digital Healthcare Platform
          </h1>
          <p className="text-sm text-slate-600">
            Clinical, administrative, and financial workflows in one workspace.
          </p>
        </div>
      </div>
    </section>
  );
}
