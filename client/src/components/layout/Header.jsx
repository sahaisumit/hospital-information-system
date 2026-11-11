import { Bell, Menu, Search, X } from "lucide-react";
import { api } from "../../lib/api";

function Header({
  open,
  setOpen,
  search,
  setSearch,
  searchResults,
  setSearchResults,
  showSearchResults,
  setShowSearchResults,
  openSearchResult,
  notifications,
  showNotifications,
  setShowNotifications,
  loadNotifications,
  notificationCount,
  nav,
  theme,
  setTheme,
  user,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
      {/* MOBILE MENU */}
      <button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"}>
        {open ? <X /> : <Menu />}
      </button>

      {/* ==========================================
          GLOBAL SEARCH
      ========================================== */}
      <div className="header-search-wrapper relative max-w-2xl flex-1">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:bg-white">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              if (search.trim()) {
                setShowSearchResults(true);
              }
            }}
            className="w-full border-0 bg-transparent py-2.5 text-sm outline-none focus:shadow-none"
            placeholder="Search patients, doctors, records..."
          />

          {search && (
            <button
              className="bg-transparent px-2 text-xl text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch("");
                setSearchResults([]);
                setShowSearchResults(false);
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* SEARCH RESULTS */}
        {showSearchResults && search.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={`${result.route}-${result._id}`}
                  className="flex w-full flex-col gap-1 border-b border-slate-100 bg-white px-4 py-3 text-left hover:bg-blue-50"
                  onClick={() => openSearchResult(result)}
                >
                  <div>
                    <strong>
                      {result.name ||
                        result.testName ||
                        result.bedNumber ||
                        result.status ||
                        "Record"}
                    </strong>

                    <small>{result.resourceType}</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-5 text-center text-sm text-slate-600">No records found.</div>
            )}
          </div>
        )}
      </div>

      {/* ==========================================
          NOTIFICATIONS
      ========================================== */}
      {["admin", "pharmacist"].includes(user.role) && (
      <div className="relative">
        <button
          className="relative grid h-11 w-11 place-items-center rounded-xl bg-transparent text-slate-700 hover:bg-slate-100"
          onClick={() => {
            setShowNotifications(!showNotifications);

            if (!showNotifications) {
              loadNotifications();
            }
          }}
        >
          <Bell size={20} />

          {notificationCount > 0 && (
            <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[500px] w-[min(360px,90vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <strong>Notifications</strong>

              <button onClick={() => setShowNotifications(false)}>×</button>
            </div>

            {/* LOW STOCK */}
            {notifications.lowStock.length > 0 && (
              <div className="py-3">
                <h4>Low Stock</h4>

                {notifications.lowStock.map((medicine) => (
                  <button
                    key={medicine._id}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-blue-50"
                    onClick={() => {
                      setShowNotifications(false);
                      nav("/medicines");
                    }}
                  >
                    <strong>{medicine.name}</strong>

                    <span>Only {medicine.quantity} remaining</span>
                  </button>
                ))}
              </div>
            )}

            {/* EXPIRING MEDICINES */}
            {notifications.expiring.length > 0 && (
              <div className="py-3">
                <h4>Expiring Medicines</h4>

                {notifications.expiring.map((medicine) => (
                  <button
                    key={medicine._id}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-blue-50"
                    onClick={() => {
                      setShowNotifications(false);
                      nav("/medicines");
                    }}
                  >
                    <strong>{medicine.name}</strong>

                    <span>
                      Expiry:{" "}
                      {medicine.expiryDate
                        ? new Date(
                            medicine.expiryDate,
                          ).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* NO NOTIFICATIONS */}
            {notificationCount === 0 && (
              <div className="flex flex-col items-center p-8 text-slate-500">
                <Bell size={24} />

                <p>No new notifications</p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* AVAILABILITY QUICK TOGGLE */}
      {user.role !== "patient" && <button
        type="button"
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${user.is_available !== false ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
        onClick={async () => {
          try {
            const nextStatus = !(user.is_available !== false);
            const nextNote = nextStatus ? "Available" : "Not Available (Away)";
            user.is_available = nextStatus;
            user.status_note = nextNote;
            localStorage.setItem("his_user", JSON.stringify(user));

            await api("/users/availability", {
              method: "PATCH",
              body: JSON.stringify({ is_available: nextStatus, status_note: nextNote }),
            });
            // Force re-render if needed
            window.dispatchEvent(new Event("storage"));
          } catch (e) {
            console.error("Failed to update availability:", e);
          }
        }}
        title={`Click to switch status (Currently ${user.is_available !== false ? "Available" : "Not Available"})`}
      >
        <span className="inline-block h-2 w-2 rounded-full" />
        <span className="text-xs font-semibold">
          {user.is_available !== false ? "Available" : "Not Available"}
        </span>
      </button>}

      {/* THEME TOGGLE */}
      <button
        className="grid h-10 w-10 place-items-center rounded-xl border border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100"
        onClick={() =>
          setTheme(theme === "light" ? "dark" : "light")
        }
        title={
          theme === "light"
            ? "Switch to dark mode"
            : "Switch to light mode"
        }
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* USER AVATAR WITH LINK TO PROFILE */}
      <button
        type="button"
        className="ml-auto rounded-full bg-transparent p-0"
        onClick={() => nav("/profile")}
        title="View & Manage Profile"
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{user.name?.[0] || "A"}</div>
      </button>
    </header>
  );
}

export default Header;
