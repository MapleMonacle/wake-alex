import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Public from "./Public";
import Bedroom from "./Bedroom";

const Page = location.pathname.startsWith("/bedroom") ? Bedroom : Public;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
