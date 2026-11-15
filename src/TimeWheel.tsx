// An iOS-style wheel time picker: hour, minute, AM/PM columns that scroll and snap.
// Value in/out is "HH:MM" (24-hour), same as <input type="time">.
// Scroll with a finger, trackpad or mouse wheel, click a row to jump to it, or use the arrow keys.
import { useEffect, useRef } from "react";

const ROW = 40; // px per row
const VISIBLE = 5; // rows shown; the middle one is selected

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MERIDIEM = ["AM", "PM"];

function Column({
  items,
  index,
  onChange,
  label,
  align = "center",
}: {
  items: string[];
  index: number;
  onChange: (i: number) => void;
  label: string;
  align?: "left" | "center" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const userScrolling = useRef(false);

  // Keep the wheel on the selected row when the value changes from outside.
  useEffect(() => {
    const el = ref.current;
    if (!el || userScrolling.current) return;
    if (Math.round(el.scrollTop / ROW) !== index) el.scrollTo({ top: index * ROW, behavior: "auto" });
  }, [index]);

  function onScroll() {
    const el = ref.current!;
    userScrolling.current = true;
    clearTimeout(settle.current);
    // When scrolling stops, pick the row that snapped into the middle.
    settle.current = window.setTimeout(() => {
      userScrolling.current = false;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)));
      if (i !== index) onChange(i);
      el.scrollTo({ top: i * ROW, behavior: "smooth" });
    }, 90);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = Math.max(0, Math.min(items.length - 1, index + step));
    onChange(i);
    ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
  }

  return (
    <div
      ref={ref}
      className={`wheel-col align-${align}`}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="spinbutton"
      aria-label={label}
      aria-valuenow={index}
      aria-valuetext={items[index]}
      style={{ height: ROW * VISIBLE, paddingBlock: ROW * Math.floor(VISIBLE / 2) }}
    >
      {items.map((it, i) => (
        <div
          key={it}
          className={`wheel-item ${i === index ? "is-on" : ""}`}
          style={{ height: ROW }}
          onClick={() => {
            onChange(i);
            ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

export function TimeWheel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh, mm] = value.split(":").map(Number);
  const pm = hh >= 12;
  const h12 = hh % 12 || 12;

  const set = (h12v: number, m: number, isPm: boolean) => {
    const h24 = (h12v % 12) + (isPm ? 12 : 0);
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="wheel" style={{ height: ROW * VISIBLE }}>
      <div className="wheel-band" style={{ height: ROW, top: ROW * Math.floor(VISIBLE / 2) }} aria-hidden />
      <Column label="Hour" items={HOURS} index={h12 - 1} onChange={(i) => set(i + 1, mm, pm)} align="right" />
      <Column label="Minute" items={MINUTES} index={mm} onChange={(i) => set(h12, i, pm)} />
      <Column label="AM or PM" items={MERIDIEM} index={pm ? 1 : 0} onChange={(i) => set(h12, mm, i === 1)} align="left" />
    </div>
  );
}
