import "@fontsource-variable/archivo/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("FetchMux site root was not found");

const pilotContactUrl = import.meta.env.VITE_PILOT_CONTACT_URL?.trim();

createRoot(root).render(
  <StrictMode>
    <App {...(pilotContactUrl ? { pilotContactUrl } : {})} />
  </StrictMode>,
);
