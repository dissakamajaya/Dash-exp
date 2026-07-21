import { useEffect, useRef, type CSSProperties } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

// Dense film-grain — two layers. Light needs darker grain so it darkens the cream.
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

  // Reference palette. Dark = vivid neon on black; light = pure hues on cream.
  const palette = dark
    ? ["#ff1f2c", "#ff6a1f", "#0feded", "#5b1bff", "#ff12a8"]
    : ["#ff2c3a", "#ff7a2a", "#11c4c4", "#5a30ff", "#ff1ab0"];
  // Dark canvas = pure black; light = warm cream matching the rest of the theme.
  const base = dark ? "#000000" : "#ece8e3";
  const grainOpacity = dark ? 0.45 : 0.32;

  // 3-stop falloff helper. On dark, blobs keep hue in the falloff (color → color 00).
  // On light, the canvas is already light, so the outer stop is transparent.
  const blob = (
    color: string,
    x: string,
    y: string,
    rx: string,
    ry: string,
    alphaCore: string,
    alphaMid: string,
  ) => {
    const mid = `${color}${alphaMid}`;
    const end = dark ? `${color}00` : `transparent`;
    return `radial-gradient(ellipse ${rx} ${ry} at ${x}% ${y}%, ${color}${alphaCore} 0%, ${mid} 42%, ${end} 88%)`;
  };

  // Per-mode alpha pairs. Light needs near-full cores because the canvas is bright.
  const A = dark
    ? {
        warmCore: "ff",
        warmMid: "6f",
        coolCore: "f0",
        coolMid: "70",
        vioCore: "c2",
        vioMid: "44",
        accCore: "aa",
        accMid: "33",
        tailCore: "a8",
        tailMid: "2a",
        tail2Core: "73",
        tail2Mid: "1f",
      }
    : {
        warmCore: "ff",
        warmMid: "aa",
        coolCore: "ff",
        coolMid: "aa",
        vioCore: "f0",
        vioMid: "66",
        accCore: "d6",
        accMid: "5c",
        tailCore: "d6",
        tailMid: "3d",
        tail2Core: "b3",
        tail2Mid: "1a",
      };

  // Atmospheric underlay. Dark = low-alpha hue wash on black. Light = mid-alpha
  // hue wash on cream so the canvas isn't uniformly off-white where blobs miss.
  const atmosphere =
    `radial-gradient(ellipse 65% 60% at 18% 78%, ${palette[0]}${dark ? "1f" : "55"} 0%, transparent 70%), ` +
    `radial-gradient(ellipse 55% 50% at 86% 26%, ${palette[2]}${dark ? "26" : "60"} 0%, transparent 70%), ` +
    `radial-gradient(ellipse 60% 40% at 50% 110%, ${palette[4]}${dark ? "1c" : "55"} 0%, transparent 70%)`;

  const rootStyle: BgStyle = {
    backgroundColor: base,
    transition: "background-color 500ms ease, --bg-accent 600ms ease",
    "--bg-accent": accent,
  };

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
      {/* Atmospheric underlay — sits below the main mesh */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: atmosphere,
          opacity: 1,
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
        {/* Layer A: elongated warm blobs (red/orange) along the lower-left diagonal */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[0], "14", "30", "42%", "26%", A.warmCore, A.warmMid),
              blob(palette[1], "30", "70", "48%", "30%", A.warmCore, A.warmMid),
            ].join(", "),
            animation: "bg-drift-a 28s ease-in-out infinite",
          }}
        />
        {/* Layer B: cool blobs (teal/violet) along the upper-right diagonal */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[2], "82", "20", "44%", "26%", A.coolCore, A.coolMid),
              blob(palette[3], "76", "72", "46%", "30%", A.vioCore, A.vioMid),
              blob("var(--bg-accent)", "58", "50", "32%", "22%", A.accCore, A.accMid),
            ].join(", "),
            animation: "bg-drift-b 34s ease-in-out infinite",
          }}
        />
        {/* Layer C: hot magenta streak — reference's signature bottom-edge tail */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              blob(palette[4], "40", "88", "70%", "20%", A.tailCore, A.tailMid),
              blob(palette[4], "22", "82", "44%", "18%", A.tail2Core, A.tail2Mid),
            ].join(", "),
            animation: "bg-drift-a 41s ease-in-out infinite",
          }}
        />
      </div>
      {/* Mid-frequency grain */}
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
      {/* Fine white grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_FINE,
          backgroundRepeat: "repeat",
          backgroundSize: "140px 140px",
          opacity: dark ? 0.32 : 0.24,
        }}
      />
    </div>
  );
}
