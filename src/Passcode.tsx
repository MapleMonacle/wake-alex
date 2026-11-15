// iPhone-style passcode screen guarding Alex's phone. Six digits; wrong code shakes and clears.
// Works with taps, clicks, or the keyboard (digits + Backspace).
import { useEffect, useState } from "react";
import { checkOwner, setOwnerKey } from "./lib/bed";

const LENGTH = 6;
const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
] as const;

export function Passcode({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(0);
  const [busy, setBusy] = useState(false);

  async function press(d: string) {
    if (busy || code.length >= LENGTH) return;
    const next = code + d;
    setCode(next);
    if (next.length < LENGTH) return;
    setBusy(true);
    const ok = await checkOwner(next);
    setBusy(false);
    if (ok) {
      setOwnerKey(next);
      onUnlock();
    } else {
      setWrong((w) => w + 1);
      setTimeout(() => setCode(""), 420);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) void press(e.key);
      else if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="passcode" aria-label="Enter passcode">
      <p className="pc-title">{wrong ? "Wrong passcode" : "Enter Passcode"}</p>
      <p className="pc-sub">This is Alex's phone.</p>
      <div className={`pc-dots ${wrong ? "shake" : ""}`} key={wrong} aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => (
          <i key={i} className={i < code.length ? "on" : ""} />
        ))}
      </div>
      <div className="pc-pad">
        {KEYS.map(([d, letters]) => (
          <button key={d} onClick={() => press(d)} aria-label={d}>
            <span className="d">{d}</span>
            <span className="l">{letters}</span>
          </button>
        ))}
        <span />
        <button onClick={() => press("0")} aria-label="0">
          <span className="d">0</span>
        </button>
        <button className="pc-del" onClick={() => setCode((c) => c.slice(0, -1))} aria-label="Delete">
          {code ? "Delete" : ""}
        </button>
      </div>
      <p className="pc-foot">Not Alex? Scan the code on the screen to be disappointed in him instead.</p>
    </section>
  );
}
