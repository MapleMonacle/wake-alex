// Disappointment over time: a single-series step chart from the moment the alarm went off.
// One series, so no legend: the card title names it. Hover shows the count at any moment.
import { useRef, useState } from "react";
import { clock } from "./lib/bed";
import { SELF } from "./lib/types";

const W = 640;
const H = 200;
const PAD = { l: 36, r: 12, t: 14, b: 26 };

export function DisappointmentChart({ alarmAt, joins, end }: { alarmAt: number; joins: number[]; end: number }) {
  const ref = useRef<SVGSVGElement>(null);
  // Hover is stored as a fraction of the plot width, so it stays correct while the chart grows live.
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);

  const t1 = Math.max(end, alarmAt + 10_000);
  const total = SELF + joins.length;
  const yMax = Math.max(4, Math.ceil(total * 1.15));
  const x = (t: number) => PAD.l + ((t - alarmAt) / (t1 - alarmAt)) * (W - PAD.l - PAD.r);
  const y = (n: number) => H - PAD.b - (n / yMax) * (H - PAD.t - PAD.b);
  const countAt = (t: number) => SELF + joins.filter((j) => j <= t).length;

  // Step path: flat, then up at each join.
  let d = `M${x(alarmAt)},${y(SELF)}`;
  joins.forEach((j, i) => {
    d += ` H${x(j)} V${y(SELF + i + 1)}`;
  });
  d += ` H${x(t1)}`;
  const area = `${d} V${y(0)} H${x(alarmAt)} Z`;

  const ticks = [0, Math.round(yMax / 2), yMax];
  // Short ranges need seconds, or both ends read "12:14 p.m."
  const label = (t: number) =>
    t1 - alarmAt < 10 * 60_000
      ? new Date(t).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      : clock(t);

  const hover =
    hoverFrac === null
      ? null
      : (() => {
          const t = alarmAt + hoverFrac * (t1 - alarmAt);
          return { x: PAD.l + hoverFrac * (W - PAD.l - PAD.r), t, n: countAt(t) };
        })();

  function onMove(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHoverFrac(Math.min(1, Math.max(0, (px - PAD.l) / (W - PAD.l - PAD.r))));
  }

  return (
    <figure className="chart">
      <figcaption>Disappointment since the alarm went off</figcaption>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Step chart: ${total} people disappointed by ${clock(t1)}, starting from 1 at ${clock(alarmAt)}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverFrac(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text className="axis" x={PAD.l} y={H - 6}>
          {label(alarmAt)}
        </text>
        <text className="axis" x={W - PAD.r} y={H - 6} textAnchor="end">
          {label(t1)}
        </text>
        <path className="area" d={area} />
        <path className="line" d={d} />
        <circle className="dot" cx={x(t1)} cy={y(total)} r={5} />
        {hover && (
          <g>
            <line className="cross" x1={hover.x} x2={hover.x} y1={PAD.t} y2={H - PAD.b} />
            <circle className="dot" cx={hover.x} cy={y(hover.n)} r={5} />
          </g>
        )}
      </svg>
      {hover && (
        <div className="tip" style={{ left: `${(hover.x / W) * 100}%` }}>
          <b>{hover.n}</b> disappointed · {label(hover.t)}
        </div>
      )}
    </figure>
  );
}
