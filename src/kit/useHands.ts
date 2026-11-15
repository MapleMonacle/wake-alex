// Webcam hand tracking (MediaPipe). 21 landmarks per hand, ~30fps, runs fully on-device.
// Usage: const { videoRef, hands, ready } = useHands(on, { deviceId }); <video ref={videoRef} muted playsInline />
// Draw on top with <HandOverlay hands={hands} />.
// Landmark 8 = index fingertip, 4 = thumb tip, 0 = wrist. x/y are 0..1 of the raw (unmirrored) frame.
import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

// Keep this version in sync with package.json's @mediapipe/tasks-vision.
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type Hand = { landmarks: NormalizedLandmark[]; side: "Left" | "Right" };

export function useHands(enabled = true, { numHands = 2, deviceId }: { numHands?: number; deviceId?: string } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hands, setHands] = useState<Hand[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: HandLandmarker | null = null;
    let cancelled = false;

    (async () => {
      try {
        const files = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await HandLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands,
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
        });
        const video = videoRef.current;
        if (!video || cancelled) return;
        video.srcObject = stream;
        video.style.transform = "scaleX(-1)"; // mirror so it feels like a mirror
        await video.play();
        setReady(true);
        let last = -1;
        const loop = () => {
          if (video.currentTime !== last && landmarker) {
            last = video.currentTime;
            const r = landmarker.detectForVideo(video, performance.now());
            setHands(
              r.landmarks.map((lm, i) => ({
                landmarks: lm,
                side: (r.handedness[i]?.[0]?.categoryName ?? "Right") as Hand["side"],
              })),
            );
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [enabled, numHands, deviceId]);

  return { videoRef, hands, ready, error };
}

// Gesture helpers
const dist = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
export const isPinching = (h: Hand) => dist(h.landmarks[4], h.landmarks[8]) < 0.05;
export const fingersUp = (h: Hand) =>
  [8, 12, 16, 20].filter((tip) => h.landmarks[tip].y < h.landmarks[tip - 2].y).length;
export const isFist = (h: Hand) => fingersUp(h) === 0;
