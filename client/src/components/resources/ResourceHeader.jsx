import PageTitle from "../common/PageTitle";

function ResourceHeader({
  c,
  setShow,
  deleteSelected,
  canCreate,
  canDelete,
}) {
  return (
    <PageTitle
      title={c.title}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button onClick={() => setShow(true)}>+ Add New</button>
          )}

          {canDelete && (
            <button className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700" onClick={deleteSelected}>
              Delete Selected
            </button>
          )}
        </div>
      }
    />
  );
}

export default ResourceHeader;