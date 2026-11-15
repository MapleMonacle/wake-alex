// Disappointment over time: a single-series step chart from the moment the alarm went off.
// One series, so no legend: the card title names it. Hover (or drag) shows the count at any moment.
// The viewBox matches the card's real width on a phone, so 11px axis text is really 11px.
import { useRef, useState } from "react";
import { clock, duration } from "./lib/bed";
import { SELF } from "./lib/types";

const W = 321;
const H = 124;
const PAD = { l: 22, r: 12, t: 12, b: 24 };

export function DisappointmentChart({ alarmAt, joins, end, live }: { alarmAt: number; joins: number[]; end: number; live?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  // Hover is stored as a fraction of the plot width, so it stays correct while the chart grows live.
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);

  const t1 = Math.max(end, alarmAt + 10_000);
  const shown = joins.filter((j) => j <= t1);
  const total = SELF + shown.length;
  // Even ceiling with headroom, so the middle gridline is a whole person.
  const yMax = Math.max(4, Math.ceil((total * 1.2) / 2) * 2);
  const plotW = W - PAD.l - PAD.r;
  const x = (t: number) => PAD.l + (Math.max(0, t - alarmAt) / (t1 - alarmAt)) * plotW;
  const y = (n: number) => H - PAD.b - (n / yMax) * (H - PAD.t - PAD.b);
  const countAt = (t: number) => SELF + shown.filter((j) => j <= t).length;

  // Step path: flat, then up at each join.
  let d = `M${x(alarmAt)},${y(SELF)}`;
  shown.forEach((j, i) => {
    d += ` H${x(j).toFixed(1)} V${y(SELF + i + 1).toFixed(1)}`;
  });
  d += ` H${x(t1)}`;
  const area = `${d} V${y(0)} H${x(alarmAt)} Z`;

  const ticks = [0, yMax / 2, yMax];

  const hover =
    hoverFrac === null
      ? null
      : (() => {
          const t = alarmAt + hoverFrac * (t1 - alarmAt);
          return { x: PAD.l + hoverFrac * plotW, t, n: countAt(t) };
        })();

  function onMove(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHoverFrac(Math.min(1, Math.max(0, (px - PAD.l) / plotW)));
  }
  const clear = () => setHoverFrac(null);

  return (
    <figure className="chart">
      <figcaption>
        <span>Disappointment over time</span>
        <span className="chart-now">{hover ? `${hover.n} at +${duration(hover.t - alarmAt)}` : live ? "live" : "final"}</span>
      </figcaption>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Step chart: ${total} ${total === 1 ? "person" : "people"} disappointed by ${clock(t1)}, starting from 1 at ${clock(alarmAt)}.`}
        onPointerDown={onMove}
        onPointerMove={onMove}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onPointerUp={(e) => e.pointerType !== "mouse" && clear()}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--red)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--red)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? "base" : "grid"} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 7} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text className="axis" x={PAD.l} y={H - 5}>
          Alarm, {clock(alarmAt)}
        </text>
        <text className="axis" x={W - PAD.r} y={H - 5} textAnchor="end">
          {live ? "Now" : `Up, ${clock(end)}`}
        </text>
        <path d={area} fill="url(#chart-fill)" />
        <path className="line" d={d} />
        {live && !hover && <circle className="halo" cx={x(t1)} cy={y(total)} r={5} />}
        <circle className="dot" cx={x(t1)} cy={y(total)} r={4.5} />
        {hover && (
          <g>
            <line className="cross" x1={hover.x} x2={hover.x} y1={PAD.t} y2={H - PAD.b} />
            <circle className="dot" cx={hover.x} cy={y(hover.n)} r={4.5} />
          </g>
        )}
      </svg>
    </figure>
  );
}
