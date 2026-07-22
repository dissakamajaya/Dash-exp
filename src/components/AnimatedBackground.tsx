import { GrainGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import { type CSSProperties } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

/**
 * Hex color lerp — mix `a` toward `b` by `t` in [0,1]. Used to pull the app's
 * saturated palette toward the base so the shader reads cinematic instead of neon.
 * (Paper's own preset uses low-saturation earth tones — #3E6172, #A49B74, #568C50 —
 * to get that moody grain-gradient feel. Our brand palette is louder; we tone it
 * down here so the shader mood matches Paper's while keeping our hues.)
 */
function mix(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${(
    (lerp(ar, br) << 16) |
    (lerp(ag, bg) << 8) |
    lerp(ab, bb)
  )
    .toString(16)
    .padStart(6, "0")}`;
}


export default function AnimatedBackground({ accent, dark }: Props) {
  const reducedMotion = useReducedMotion();
  const palette = dark
    ? ["#7c3cec", "#ec3c8b", "#3c56ec", "#3cecc9"]
    : ["#bca0ee", "#eea0c3", "#a0abee", "#a0eede"];
  const base = dark ? "#0b0b10" : "#f4f4f6";
  const edge = dark ? "rgba(11, 11, 16, .55)" : "rgba(244, 244, 246, .45)";

  // Three-tone composition mirrors Paper's grain-gradient preset. Accent stays
  // vivid so hover/selection still shifts the mood; the two support tones are
  // pulled toward base for the moody Paper feel.
  const colors = [
    accent,
    mix(palette[2], base, dark ? 0.42 : 0.28),
    mix(palette[3], base, dark ? 0.55 : 0.35),
  ];

  const rootStyle: CSSProperties = {
    backgroundColor: base,
    transition: "background-color 500ms ease",
  };

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
      <GrainGradient
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        colors={colors}
        colorBack={base}
        shape="corners"
        scale={1.3}
        rotation={0}
        softness={0}
        intensity={0.15}
        noise={0.5}
        speed={reducedMotion ? 0 : 1}
        offsetX={0}
        offsetY={0}
        minPixelRatio={2}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 90% 80% at 50% 52%, transparent 45%, ${edge} 100%)`,
          transition: "background 500ms ease",
        }}
      />
    </div>
  );
}
