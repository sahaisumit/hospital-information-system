import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";

import "./styles.css";

document.documentElement.setAttribute(
  "data-theme",
  localStorage.getItem("his_theme") || "light",
);

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>,
);
