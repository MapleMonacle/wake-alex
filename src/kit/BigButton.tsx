// The big red button. Physically satisfying, functionally useless. Track: "stupidest button".
import { useState, type ReactNode } from "react";

export function BigButton({
  onPress,
  children = "DO NOT PRESS",
  size = 220,
}: {
  onPress: () => void;
  children?: ReactNode;
  size?: number;
}) {
  const [down, setDown] = useState(false);
  return (
    <button
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onClick={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        color: "white",
        fontWeight: 900,
        fontSize: size / 10,
        letterSpacing: 1,
        background: "radial-gradient(circle at 35% 30%, #ff7a7a, #e10600 55%, #8a0000)",
        boxShadow: down ? "0 2px 0 #5a0000, inset 0 4px 12px #0006" : "0 12px 0 #5a0000, 0 18px 30px #0007",
        transform: down ? "translateY(10px)" : "none",
        transition: "transform 60ms, box-shadow 60ms",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}
