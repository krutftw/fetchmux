import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Portal } from "./portal/Portal.js";
import "./styles.css";
import "./portal/portal.css";

const root = document.getElementById("portal-root");
if (!root) throw new Error("FetchMux portal root was not found");

createRoot(root).render(
  <StrictMode>
    <Portal />
  </StrictMode>,
);
