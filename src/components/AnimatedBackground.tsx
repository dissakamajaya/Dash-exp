import { useEffect, useRef } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

export default function AnimatedBackground({ accent, dark }: Props) {
  const meshRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveMesh = (event: MouseEvent) => {
      const x = ((event.clientX / window.innerWidth) * 2 - 1) * 18;
      const y = ((event.clientY / window.innerHeight) * 2 - 1) * 14;
      meshRef.current?.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0) scale(1.04)`);
    };
    const resetMesh = () => {
      meshRef.current?.style.setProperty("transform", "translate3d(0, 0, 0) scale(1)");
    };

    window.addEventListener("mousemove", moveMesh, { passive: true });
    window.addEventListener("mouseleave", resetMesh);
    return () => {
      window.removeEventListener("mousemove", moveMesh);
      window.removeEventListener("mouseleave", resetMesh);
    };
  }, []);

  const palette = dark
    ? ["#5b2bd6", "#8a1f5c", "#163a8a", "#0e6b73"]
    : ["#c4b5fd", "#f9a8d4", "#93c5fd", "#99f6e4"];
  const base = dark ? "#06070e" : "#f4f2ef";
  const edge = dark ? "rgba(6, 7, 14, .88)" : "rgba(244, 242, 239, .72)";

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ backgroundColor: base, transition: "background-color 500ms ease" }}
    >
      <div
        ref={meshRef}
        className="absolute -inset-[12%]"
        style={{
          backgroundImage: [
            `radial-gradient(ellipse 42% 46% at 22% 22%, ${accent}a8 0%, transparent 72%)`,
            `radial-gradient(ellipse 40% 44% at 78% 24%, ${palette[1]}92 0%, transparent 74%)`,
            `radial-gradient(ellipse 48% 50% at 30% 78%, ${palette[2]}9a 0%, transparent 72%)`,
            `radial-gradient(ellipse 42% 48% at 78% 74%, ${palette[3]}86 0%, transparent 72%)`,
          ].join(", "),
          transition: "transform 500ms cubic-bezier(.23, 1, .32, 1), background-image 700ms ease",
          transform: "translate3d(0, 0, 0) scale(1)",
          willChange: "transform",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 46%, transparent 26%, ${edge} 100%)`,
          transition: "background 500ms ease",
        }}
      />
    </div>
  );
}
