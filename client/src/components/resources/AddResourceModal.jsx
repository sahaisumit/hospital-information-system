import ResourceInput from "./ResourceInput";

function AddResourceModal({
  show,
  setShow,
  save,
  c,
  type,
  form,
  setForm,
  patients,
  doctors,
  setShowPatientForm,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <form className="my-auto grid max-h-[90vh] w-full max-w-xl content-start gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onSubmit={save}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-3 sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white pb-3">
          <h2>Add {c.title.slice(0, -1)}</h2>

          <button type="button" onClick={() => setShow(false)}>
            ×
          </button>
        </div>

        {c.fields.map((f) => (
          <label key={f}>
            {f.replace(/([A-Z])/g, " $1")}

            <ResourceInput
              type={type}
              field={f}
              form={form}
              setForm={setForm}
              patients={patients}
              doctors={doctors}
            />

            {type === "appointments" && f === "patient" && (
              <button
                type="button"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                onClick={() => setShowPatientForm(true)}
              >
                + Register New Patient
              </button>
            )}
          </label>
        ))}

        {type === "bills" && (
          <label>
            amount
            <input
              type="number"
              value={form.amount || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
            />
          </label>
        )}

        <button>Create Record</button>
      </form>
    </div>
  );
}

export default AddResourceModal;
