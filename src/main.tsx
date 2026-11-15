import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Public from "./Public";
import Bedroom from "./Bedroom";

// /         everyone: the Disappointment Index
// /bedroom  Alex's phone (needs ?key= once)
// /stage    both phones side by side, for the projector (Alex's phone needs the key too)
function Stage() {
  return (
    <div className="stage-view">
      <Bedroom label="Alex's phone" />
      <Public label="Everyone else's phone" />
    </div>
  );
}

const path = location.pathname;
const Page = path.startsWith("/bedroom") ? Bedroom : path.startsWith("/stage") ? Stage : Public;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
