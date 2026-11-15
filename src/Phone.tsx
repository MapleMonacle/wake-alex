// A simulated phone. On a laptop/projector the app renders inside this frame;
// on a real phone (narrow screens) the frame disappears and the app is full screen.
//
// The frame is always laid out at a real phone's size (393 x 852 points) and then scaled
// to fit the window, so type and spacing stay in proportion at 720p and at 1080p alike.
import { useEffect, useState, type ReactNode } from "react";

const BODY_W = 417; // 393 screen + 12 bezel each side
const BODY_H = 876;

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

// The stage puts captions beside the phones on wide screens and above them otherwise.
export const stageIsWide = (w: number, h: number) => w / h >= 1.5 && w >= 1100;

// The app mark: a crescent moon that is also a C.
export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <svg className="app-icon" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="icon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f78" />
          <stop offset="1" stopColor="#0d0f2c" />
        </linearGradient>
        <mask id="icon-crescent">
          <rect width="32" height="32" fill="#000" />
          <circle cx="15.5" cy="16" r="8.6" fill="#fff" />
          <circle cx="19.6" cy="14.2" r="7.1" fill="#000" />
        </mask>
      </defs>
      <rect width="32" height="32" rx="7.4" fill="url(#icon-sky)" />
      <rect width="32" height="32" fill="#f5f0e1" mask="url(#icon-crescent)" />
    </svg>
  );
}

function StatusBar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="statusbar" aria-hidden>
      <span className="sb-time">
        {h}:{m}
      </span>
      <span className="island" />
      <span className="sb-icons">
        <svg width="18" height="12" viewBox="0 0 18 12">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.1-1.2A10.3 10.3 0 0 0 8.5 1 10.3 10.3 0 0 0 1.4 3.8l1.1 1.2a8.7 8.7 0 0 1 6-2.4z" />
          <path d="M8.5 6.3c1.3 0 2.5.5 3.4 1.3L13 6.4a6.6 6.6 0 0 0-9 0l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3z" />
          <path d="M8.5 9.9a2 2 0 0 0-1.4.6l1.4 1.5 1.4-1.5a2 2 0 0 0-1.4-.6z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="17" height="9" rx="2.4" />
          <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

export function Phone({ children, dark, staged }: { children: ReactNode; dark: boolean; staged?: boolean }) {
  const { w, h } = useViewport();
  if (w < 700) return <>{children}</>;

  let s: number;
  if (staged) {
    const wide = stageIsWide(w, h);
    const byHeight = (h - (wide ? 56 : 220)) / BODY_H; // narrow: title + captions sit above
    const byWidth = (w - (wide ? 720 : 120)) / (BODY_W * 2); // wide: leave room for captions + the QR code
    s = Math.min(byHeight, byWidth);
  } else {
    s = Math.min((h - 48) / BODY_H, (w - 48) / BODY_W);
  }
  s = Math.max(0.35, Math.min(1.6, s));

  const phone = (
    <div className="phone-slot" style={{ width: BODY_W * s, height: BODY_H * s }}>
      <div className="phone" style={{ transform: `scale(${s})` }}>
        <div className={`phone-screen ${dark ? "sb-dark" : "sb-light"}`}>
          <StatusBar />
          {children}
          <span className="home-bar" aria-hidden />
        </div>
      </div>
    </div>
  );
  return staged ? phone : <div className="desk">{phone}</div>;
}
