import { useEffect, useRef, type CSSProperties } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

// Dense film-grain — visible across the whole canvas. Two layers: fine + mid.
const NOISE_FINE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")";
const NOISE_MID =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.05' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='90' height='90' filter='url(%23n)'/%3E%3C/svg%3E\")";

type BgStyle = CSSProperties & { "--bg-accent": string };

export default function AnimatedBackground({ accent, dark }: Props) {
  const meshRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveMesh = (event: MouseEvent) => {
      const x = ((event.clientX / window.innerWidth) * 2 - 1) * 14;
      const y = ((event.clientY / window.innerHeight) * 2 - 1) * 10;
      meshRef.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0)`);
    };
    const resetMesh = () => {
      meshRef.current?.style.setProperty("transform", "translate3d(0, 0, 0)");
    };

    window.addEventListener("mousemove", moveMesh, { passive: true });
    window.addEventListener("mouseleave", resetMesh);
    return () => {
      window.removeEventListener("mousemove", moveMesh);
      window.removeEventListener("mouseleave", resetMesh);
    };
  }, []);

  // Reference palette: pure-black canvas with vivid flowing color blobs.
  const palette = dark
    ? ["#ff1f2c", "#ff6a1f", "#0feded", "#5b1bff", "#ff12a8"]
    : ["#c8222e", "#cc4f17", "#0a9b9b", "#3a1494", "#bf0f7e"];
  const base = dark ? "#000000" : "#07070a";
  const grainOpacity = dark ? 0.45 : 0.4;

  // 3-stop falloff helper — keeps the hue alive (not transparent) before going
  // black. Bleeding color fields, not hard edges.
  const blob = (
    color: string,
    x: string,
    y: string,
    rx: string,
    ry: string,
    alphaCore: string,
    alphaMid: string,
  ) =>
    `radial-gradient(ellipse ${rx} ${ry} at ${x}% ${y}%, ${color}${alphaCore} 0%, ${color}${alphaMid} 38%, ${color}00 80%)`;

  // Atmospheric hue wash — sits as its own underlay div so it only shows
  // through gaps between blobs (NOT over all of black).
  const atmosphere =
    `radial-gradient(ellipse 65% 60% at 18% 78%, ${palette[0]}1f 0%, transparent 70%), ` +
    `radial-gradient(ellipse 55% 50% at 86% 26%, ${palette[2]}26 0%, transparent 70%), ` +
    `radial-gradient(ellipse 60% 40% at 50% 110%, ${palette[4]}1c 0%, transparent 70%)`;

  const rootStyle: BgStyle = {
    backgroundColor: base,
    transition: "background-color 500ms ease, --bg-accent 600ms ease",
    "--bg-accent": accent,
  };

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
      {/* Atmospheric underlay — wide, low-alpha radial blobs in the same
          diagonal flow as the main blobs. Sits below them. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: atmosphere,
          opacity: dark ? 1 : 0.85,
        }}
      />
      <div
        ref={meshRef}
        className="absolute -inset-[12%]"
        style={{
          transition: "transform 600ms cubic-bezier(.23, 1, .32, 1)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      >
        {/* Layer A: elongated warm blobs (red/orange) stretched along the
            lower-left diagonal — pulled, not round. */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[0], "14", "30", "42%", "26%", "ff", "6f"),
              blob(palette[1], "30", "70", "48%", "30%", "d6", "55"),
            ].join(", "),
            animation: "bg-drift-a 28s ease-in-out infinite",
          }}
        />
        {/* Layer B: cool blobs (teal/violet) along the upper-right diagonal,
            full-saturation cores so the cool half actually reads. */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[2], "82", "20", "44%", "26%", "f0", "70"),
              blob(palette[3], "76", "72", "46%", "30%", "c2", "44"),
              blob("var(--bg-accent)", "58", "50", "32%", "22%", "aa", "33"),
            ].join(", "),
            animation: "bg-drift-b 34s ease-in-out infinite",
          }}
        />
        {/* Layer C: hot magenta streak — reference's signature tail along
            the bottom edge with a wider, softer footprint. */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[4], "40", "88", "70%", "20%", "a8", "2a"),
              blob(palette[4], "22", "82", "44%", "18%", "73", "1f"),
            ].join(", "),
            animation: "bg-drift-a 41s ease-in-out infinite",
          }}
        />
      </div>
      {/* Mid-frequency grain — adds the textured film feel */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_MID,
          backgroundRepeat: "repeat",
          backgroundSize: "90px 90px",
          opacity: grainOpacity,
          mixBlendMode: dark ? "screen" : "multiply",
        }}
      />
      {/* Fine white grain — sits on top so it reads over every color blob */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_FINE,
          backgroundRepeat: "repeat",
          backgroundSize: "140px 140px",
          opacity: dark ? 0.32 : 0.26,
        }}
      />
    </div>
  );
}
