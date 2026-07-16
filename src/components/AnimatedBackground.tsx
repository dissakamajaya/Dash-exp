import { useEffect, useRef } from "react";

interface Props {
  accent: string;
  dark: boolean;
}

type Blob = {
  id: string;
  darkColor: string;
  lightColor: string;
  r: number;
  cxPath: string;
  cyPath: string;
  durX: string;
  durY: string;
  darkOpacity: number;
  lightOpacity: number;
  // How strongly this blob is pulled toward the pointer (parallax depth)
  followStrength: number;
  // Smoothing factor: lower = lazier/slower to catch up
  ease: number;
};

const BLOBS: Blob[] = [
  {
    id: "b0",
    darkColor: "#5b2bd6",
    lightColor: "#c4b5fd",
    r: 520,
    cxPath: "260;680;920;540;260",
    cyPath: "220;420;680;340;220",
    durX: "31s",
    durY: "37s",
    darkOpacity: 0.85,
    lightOpacity: 0.65,
    followStrength: 130,
    ease: 0.055,
  },
  {
    id: "b1",
    darkColor: "#8a1f5c",
    lightColor: "#f9a8d4",
    r: 480,
    cxPath: "1280;900;560;1100;1280",
    cyPath: "240;520;360;640;240",
    durX: "27s",
    durY: "33s",
    darkOpacity: 0.7,
    lightOpacity: 0.55,
    followStrength: -90,
    ease: 0.045,
  },
  {
    id: "b2",
    darkColor: "#163a8a",
    lightColor: "#93c5fd",
    r: 560,
    cxPath: "420;780;340;620;420",
    cyPath: "640;380;760;520;640",
    durX: "35s",
    durY: "29s",
    darkOpacity: 0.75,
    lightOpacity: 0.5,
    followStrength: 100,
    ease: 0.035,
  },
  {
    id: "b3",
    darkColor: "#0e6b73",
    lightColor: "#99f6e4",
    r: 440,
    cxPath: "1180;760;1020;1320;1180",
    cyPath: "720;520;320;580;720",
    durX: "39s",
    durY: "31s",
    darkOpacity: 0.6,
    lightOpacity: 0.45,
    followStrength: -70,
    ease: 0.05,
  },
  {
    id: "b4",
    darkColor: "#7a3a10",
    lightColor: "#fdba74",
    r: 360,
    cxPath: "820;520;1080;720;820",
    cyPath: "460;720;300;560;460",
    durX: "23s",
    durY: "26s",
    darkOpacity: 0.45,
    lightOpacity: 0.4,
    followStrength: 150,
    ease: 0.07,
  },
  {
    id: "b5",
    darkColor: "#3a1560",
    lightColor: "#d8b4fe",
    r: 500,
    cxPath: "160;520;380;220;160",
    cyPath: "500;200;640;420;500",
    durX: "41s",
    durY: "34s",
    darkOpacity: 0.7,
    lightOpacity: 0.5,
    followStrength: -120,
    ease: 0.04,
  },
];

const VIEW_W = 1600;
const VIEW_H = 900;

export default function AnimatedBackground({ accent, dark }: Props) {
  const groupRefs = useRef<(SVGGElement | null)[]>([]);
  const target = useRef({ x: 0, y: 0 }); // normalized -1..1, viewBox-space pointer offset from center
  const current = useRef(BLOBS.map(() => ({ x: 0, y: 0 })));
  const raf = useRef<number>(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.current = { x: nx, y: ny };
    };
    const handleLeave = () => {
      target.current = { x: 0, y: 0 };
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    const tick = () => {
      BLOBS.forEach((b, i) => {
        const c = current.current[i];
        const tx = target.current.x * b.followStrength;
        const ty = target.current.y * b.followStrength;
        c.x += (tx - c.x) * b.ease;
        c.y += (ty - c.y) * b.ease;
        const g = groupRefs.current[i];
        if (g) {
          g.setAttribute("transform", `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`);
        }
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const baseFill = dark ? "#06070e" : "#f4f2ef";
  const blendMode = dark ? "screen" : "multiply";
  const vignetteColor = dark ? "#06070e" : "#f4f2ef";
  const vignetteOpacity = dark ? 0.85 : 0.6;
  const noiseOpacity = dark ? 0.06 : 0.04;
  const noiseFill = dark ? "#ffffff" : "#000000";
  const noiseBlend = dark ? "overlay" : "soft-light";

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: baseFill,
        transition: "background-color 0.6s ease",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {BLOBS.map((b, i) => {
            const color = i === 0 ? accent : dark ? b.darkColor : b.lightColor;
            const opacity = dark ? b.darkOpacity : b.lightOpacity;
            return (
              <radialGradient key={b.id} id={`grad-${b.id}`} cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity={opacity}
                  style={{ transition: "stop-color 700ms ease, stop-opacity 700ms ease" }}
                />
                <stop
                  offset="55%"
                  stopColor={color}
                  stopOpacity={opacity * 0.55}
                  style={{ transition: "stop-color 700ms ease, stop-opacity 700ms ease" }}
                />
                <stop
                  offset="100%"
                  stopColor={color}
                  stopOpacity={0}
                  style={{ transition: "stop-color 700ms ease" }}
                />
              </radialGradient>
            );
          })}

          <filter id="meshWarp" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="70" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.009"
              numOctaves={2}
              seed={7}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.006 0.009;0.009 0.013;0.007 0.010;0.006 0.009"
                dur="48s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="120"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="18" />
          </filter>

          <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
            <stop offset="60%" stopColor={vignetteColor} stopOpacity="0" />
            <stop offset="100%" stopColor={vignetteColor} stopOpacity={vignetteOpacity} />
          </radialGradient>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill={baseFill} style={{ transition: "fill 0.6s ease" }} />

        <g filter="url(#meshWarp)" style={{ mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"] }}>
          {BLOBS.map((b, i) => (
            <g key={b.id} ref={(el) => { groupRefs.current[i] = el; }}>
              <circle r={b.r} fill={`url(#grad-${b.id})`}>
                <animate
                  attributeName="cx"
                  values={b.cxPath}
                  dur={b.durX}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                />
                <animate
                  attributeName="cy"
                  values={b.cyPath}
                  dur={b.durY}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
                />
              </circle>
            </g>
          ))}
        </g>

        <g opacity={noiseOpacity} style={{ mixBlendMode: noiseBlend as React.CSSProperties["mixBlendMode"] }}>
          <rect width={VIEW_W} height={VIEW_H} filter="url(#meshWarp)" fill={noiseFill} />
        </g>

        <rect width={VIEW_W} height={VIEW_H} fill="url(#vignette)" />
      </svg>
    </div>
  );
}
