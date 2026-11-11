import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

import useTheme from "../../hooks/useTheme";
import useGlobalSearch from "../../hooks/useGlobalSearch";
import useNotifications from "../../hooks/useNotifications";

function AppShell({ children, onLogout }) {
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("his_user") || "{}");

  const {
    search,
    setSearch,
    searchResults,
    setSearchResults,
    showSearchResults,
    setShowSearchResults,
    openSearchResult,
  } = useGlobalSearch();

  const { theme, setTheme } = useTheme();

  const {
    notifications,
    showNotifications,
    setShowNotifications,
    loadNotifications,
    notificationCount,
  } = useNotifications(user.role);

  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-slate-800 [&_button]:cursor-pointer [&_label]:space-y-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700 [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-slate-900 [&_input]:outline-none [&_input]:transition [&_input:focus]:border-blue-500 [&_input:focus]:ring-2 [&_input:focus]:ring-blue-100 [&_select]:min-w-0 [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-slate-900 [&_select]:outline-none [&_select]:transition [&_select:focus]:border-blue-500 [&_select:focus]:ring-2 [&_select:focus]:ring-blue-100 [&_textarea]:min-w-0 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-slate-900 [&_textarea]:outline-none [&_textarea]:transition [&_textarea:focus]:border-blue-500 [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-blue-100 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-xs [&_thead]:uppercase [&_thead]:tracking-wide [&_thead]:text-slate-500 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:font-semibold [&_td]:border-t [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_td]:text-slate-700">
      <Sidebar
        open={open}
        setOpen={setOpen}
        user={user}
        onLogout={onLogout}
      />

      <main className="min-h-screen w-full md:ml-[250px] md:w-[calc(100%-250px)]">
        <Header
          open={open}
          setOpen={setOpen}
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          showSearchResults={showSearchResults}
          setShowSearchResults={setShowSearchResults}
          openSearchResult={openSearchResult}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          loadNotifications={loadNotifications}
          notificationCount={notificationCount}
          nav={nav}
          theme={theme}
          setTheme={setTheme}
          user={user}
        />

        <section className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8">{children}</section>
      </main>
    </div>
  );
}

export default AppShell;
