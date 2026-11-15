import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { initAnalytics } from "./kit";
import App from "./App";
import KitDemo from "./KitDemo";

initAnalytics();

// No router needed for a one-page stupid idea. /kit = the toolbox playground.
const Page = location.pathname.startsWith("/kit") ? KitDemo : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
