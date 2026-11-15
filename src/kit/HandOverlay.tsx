// A canvas laid over the (mirrored) webcam video that draws the hand skeleton.
// Put it in the same position:relative box as the <video>:
//   <div className="cam"><video ref={videoRef} /><HandOverlay hands={hands} /></div>
// Pass `draw` to paint your own effects; it gets landmark coords already in canvas pixels.
import { useEffect, useRef } from "react";
import { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Hand } from "./useHands";

export type Pt = { x: number; y: number };
export type DrawFn = (ctx: CanvasRenderingContext2D, hands: Pt[][], size: { w: number; h: number }) => void;

const CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

export function HandOverlay({
  hands,
  color = "#ffffff",
  glow = 12,
  skeleton = true,
  draw,
}: {
  hands: Hand[];
  color?: string;
  glow?: number;
  skeleton?: boolean;
  draw?: DrawFn;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { clientWidth: w, clientHeight: h } = canvas;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Mirror x to match the mirrored video.
    const pts = hands.map((hand) => hand.landmarks.map((p) => ({ x: (1 - p.x) * w, y: p.y * h })));

    if (skeleton) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      for (const p of pts) {
        for (const { start, end } of CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(p[start].x, p[start].y);
          ctx.lineTo(p[end].x, p[end].y);
          ctx.stroke();
        }
        for (const q of p) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    }
    draw?.(ctx, pts, { w, h });
  }, [hands, color, glow, skeleton, draw]);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
