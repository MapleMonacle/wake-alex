// A simulated phone. On a laptop/projector the app renders inside this frame;
// on a real phone (narrow screens) the frame disappears and the app is full screen.
import { useEffect, useState, type ReactNode } from "react";

export const FRAMED = () => window.matchMedia("(min-width: 700px)").matches;

export function useFramed() {
  const [framed, setFramed] = useState(FRAMED);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 700px)");
    const on = () => setFramed(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return framed;
}

function StatusBar({ dark }: { dark: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`statusbar ${dark ? "on-dark" : "on-light"}`}>
      <span>{now.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[ap]\.m\./i, "")}</span>
      <span className="island" aria-hidden />
      <span className="icons" aria-hidden>
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="15" height="8" rx="1.5" /><rect x="23.5" y="4" width="1.8" height="4" rx="0.9" opacity="0.5" /></svg>
      </span>
    </div>
  );
}

export function Phone({ children, dark, label }: { children: ReactNode; dark: boolean; label?: string }) {
  const framed = useFramed();
  if (!framed) return <>{children}</>;
  return (
    <div className="phone-wrap">
      {label && <p className="phone-label">{label}</p>}
      <div className="phone">
        <div className="phone-screen">
          <StatusBar dark={dark} />
          {children}
          <span className="home-bar" aria-hidden />
        </div>
      </div>
    </div>
  );
}
