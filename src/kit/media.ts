// Camera helpers. On stage you'll often have a laptop cam AND an external webcam:
// pick the right one with listCameras() + useHands(on, { deviceId }).

export async function listCameras(): Promise<{ id: string; label: string }[]> {
  // Labels are blank until the page has camera permission once.
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
}

// Grab the current video frame as a JPEG data URL (for ask({ images: [...] })).
// Mirrors by default so the picture matches what the user sees on screen.
export function snapshot(video: HTMLVideoElement, { maxWidth = 768, mirror = true, quality = 0.85 } = {}) {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const w = Math.round((video.videoWidth || maxWidth) * scale);
  const h = Math.round((video.videoHeight || maxWidth * 0.75) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
