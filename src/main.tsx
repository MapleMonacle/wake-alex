import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Public from "./Public";
import Bedroom from "./Bedroom";
import { QR } from "./kit/QR";

// /         everyone: the Disappointment Index
// /bedroom  Alex's phone (needs ?key= once)
// /stage    both phones side by side, for the projector (Alex's phone needs the key too)
// Hand-drawn arrows: slightly uneven strokes, like they were drawn on with a marker.
function ArrowToRight() {
  return (
    <svg className="scribble arrow-right" viewBox="0 0 120 70" aria-hidden>
      <path d="M6 14c22-8 52-6 74 10 10 7 17 17 21 29" />
      <path d="M88 47l14 9 3-17" />
    </svg>
  );
}
function ArrowDown() {
  return (
    <svg className="scribble arrow-down" viewBox="0 0 70 90" aria-hidden>
      <path d="M12 6c-6 20 4 40 22 54 6 5 13 9 20 12" />
      <path d="M38 76l17-3-8-15" />
    </svg>
  );
}

function Stage() {
  return (
    <div className="stage-view">
      <header className="stage-title">
        <span className="tape" aria-hidden />
        <h1>clinomania</h1>
        <p className="pron">
          /ˌklaɪ.noʊˈmeɪ.ni.ə/ <i>n.</i>
        </p>
        <p className="def">
          <b>1.</b> An excessive, often overpowering desire to stay in bed, making it a daily struggle to get up, even
          after enough sleep.
        </p>
        <p className="note">
          Not a medical diagnosis, but often linked to depression, burnout or chronic fatigue. <span className="sc">Origin</span>{" "}
          Greek <i>klinē</i>, bed + <i>mania</i>, madness.
        </p>
      </header>
      <div className="stage-cap cap-a">
        <h2>Alex's phone</h2>
        <p className="hand">he set an alarm.<br />he meant well.</p>
        <ArrowToRight />
      </div>
      <div className="stage-phone phone-a">
        <Bedroom staged />
      </div>
      <div className="stage-phone phone-b">
        <Public staged />
      </div>
      <div className="stage-cap cap-b">
        <h2>Your phone</h2>
        <p className="hand">
          scan it.
          <br />
          be disappointed in him.
        </p>
        <ArrowDown />
        <div className="cap-qr">
          <span className="tape" aria-hidden />
          <QR url={location.origin} size={480} />
          <p className="cap-url">{location.host}</p>
        </div>
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
