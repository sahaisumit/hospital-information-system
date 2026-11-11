import { Activity } from "lucide-react";


function Quick({ title, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3>{title}</h3>
      {items.map((x) => (
        <div className="flex items-center gap-2 border-t border-slate-100 py-3 text-xs text-slate-600" key={x}>
          <Activity size={16} />
          {x}
        </div>
      ))}
    </div>
  );
}


export default Quick;
