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

  // Reference-style palette: pure-black canvas with vivid flowing color blobs.
  const palette = dark
    ? ["#ff1f2c", "#ff6a1f", "#0feded", "#5b1bff", "#ff12a8"]
    : ["#c8222e", "#cc4f17", "#0a9b9b", "#3a1494", "#bf0f7e"];
  const base = dark ? "#000000" : "#07070a";
  const grainOpacity = dark ? 0.7 : 0.55;

  const rootStyle: BgStyle = {
    backgroundColor: base,
    transition: "background-color 500ms ease, --bg-accent 600ms ease",
    "--bg-accent": accent,
  };

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
      <div
        ref={meshRef}
        className="absolute -inset-[12%]"
        style={{
          transition: "transform 600ms cubic-bezier(.23, 1, .32, 1)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      >
        {/* Layer A: warm blobs (red/orange) drift slow */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              `radial-gradient(ellipse 32% 30% at 18% 28%, ${palette[0]}f2 0%, transparent 68%)`,
              `radial-gradient(ellipse 32% 34% at 32% 72%, ${palette[1]}cc 0%, transparent 70%)`,
            ].join(", "),
            animation: "bg-drift-a 28s ease-in-out infinite",
          }}
        />
        {/* Layer B: cool blobs (cyan/violet) + accent drift opposite */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              `radial-gradient(ellipse 30% 32% at 78% 24%, ${palette[2]}cc 0%, transparent 70%)`,
              `radial-gradient(ellipse 34% 34% at 74% 70%, ${palette[3]}cc 0%, transparent 70%)`,
              `radial-gradient(ellipse 24% 22% at 50% 50%, color-mix(in srgb, var(--bg-accent) 65%, transparent) 0%, transparent 78%)`,
            ].join(", "),
            animation: "bg-drift-b 34s ease-in-out infinite",
          }}
        />
        {/* Layer C: hot magenta streak — the reference's signature tail */}
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse 50% 18% at 55% 92%, ${palette[4]}80 0%, transparent 72%)`,
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
