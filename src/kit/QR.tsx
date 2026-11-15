// QR code for a URL (default: this page), so the audience can join your demo from their phones.
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ url = location.href, size = 220 }: { url?: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: size, margin: 1 }).then(setSrc);
  }, [url, size]);
  return src ? <img src={src} width={size} height={size} alt={`QR code for ${url}`} /> : null;
}
