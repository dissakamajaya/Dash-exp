import { useEffect, useRef, type CSSProperties } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

// Tiny tiled SVG fractal noise — static after first paint, ~250 bytes.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

type BgStyle = CSSProperties & { "--bg-accent": string };

export default function AnimatedBackground({ accent, dark }: Props) {
  const meshRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveMesh = (event: MouseEvent) => {
      const x = ((event.clientX / window.innerWidth) * 2 - 1) * 18;
      const y = ((event.clientY / window.innerHeight) * 2 - 1) * 14;
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

  const palette = dark
    ? ["#7b4dff", "#ff3d9a", "#2d5bff", "#12c6c6"]
    : ["#b9a5ff", "#ff9ec9", "#93b4ff", "#7fe3e3"];
  const base = dark ? "#0b0b10" : "#f4f4f6";
  const edge = dark ? "rgba(11, 11, 16, .88)" : "rgba(244, 244, 246, .72)";
  const accentAlpha = dark ? "80%" : "85%";

  const rootStyle: BgStyle = {
    backgroundColor: base,
    transition: "background-color 500ms ease, --bg-accent 600ms ease",
    "--bg-accent": accent,
  };

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={rootStyle}>
      <div
        ref={meshRef}
        className="absolute -inset-[18%]"
        style={{
          transition: "transform 600ms cubic-bezier(.23, 1, .32, 1)",
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      >
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              `radial-gradient(ellipse 44% 48% at 22% 24%, color-mix(in srgb, var(--bg-accent) ${accentAlpha}, transparent) 0%, transparent 70%)`,
              `radial-gradient(ellipse 48% 50% at 30% 78%, ${palette[2]}b0 0%, transparent 72%)`,
            ].join(", "),
            animation: "bg-drift-a 22s ease-in-out infinite",
          }}
        />
        <div
          className="bg-liquid absolute inset-0"
          style={{
            backgroundImage: [
              `radial-gradient(ellipse 40% 44% at 78% 22%, ${palette[1]}a6 0%, transparent 74%)`,
              `radial-gradient(ellipse 44% 50% at 76% 76%, ${palette[3]}9a 0%, transparent 72%)`,
              `radial-gradient(ellipse 60% 52% at 50% 50%, ${palette[0]}3d 0%, transparent 78%)`,
            ].join(", "),
            animation: "bg-drift-b 31s ease-in-out infinite",
          }}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 46%, transparent 26%, ${edge} 100%)`,
          transition: "background 500ms ease",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          backgroundSize: "140px 140px",
          opacity: dark ? 0.16 : 0.1,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
