import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Public from "./Public";
import Bedroom from "./Bedroom";
import { QR } from "./kit/QR";

// /         everyone: the Disappointment Index
// /bedroom  Alex's phone (needs ?key= once)
// /stage    both phones side by side, for the projector (Alex's phone needs the key too)
function Stage() {
  return (
    <div className="stage-view">
      <header className="stage-title">
        <h1>Clinomania</h1>
        <p>
          <span className="pron">/ˌklaɪ.noʊˈmeɪ.ni.ə/</span> <i>noun</i>
        </p>
        <p className="def">An excessive desire to stay in bed.</p>
      </header>
      <div className="stage-cap cap-a">
        <p className="cap-eyebrow">The bedroom</p>
        <h2>Alex's phone</h2>
        <p className="cap-sub">He set an alarm. He meant well.</p>
      </div>
      <div className="stage-phone phone-a">
        <Bedroom staged />
      </div>
      <div className="stage-phone phone-b">
        <Public staged />
      </div>
      <div className="stage-cap cap-b">
        <p className="cap-eyebrow">The public</p>
        <h2>Everyone else's phone</h2>
        <p className="cap-sub">One press per person.</p>
        <div className="cap-qr">
          <QR url={location.origin} size={480} />
        </div>
        <p className="cap-url">{location.host}</p>
      </div>
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
