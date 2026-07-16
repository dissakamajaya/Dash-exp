import { motion } from "framer-motion";
import type { SelectorItem } from "@/data/gateway";

interface ShapeGridProps {
  items: SelectorItem[];
  hoveredIndex: number | null;
  selectedIndices: number[];
  onHover: (index: number | null) => void;
  onSelect: (item: SelectorItem) => void;
  dark: boolean;
}

const lineProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.55,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

/** Concave four-point sparkle, as drawn in the House of EXP vector sheet. */
function Sparkle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const d = `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
  return <path d={d} {...lineProps} />;
}

function starPoints(cx: number, cy: number, spikes: number, outer: number, inner: number) {
  return Array.from({ length: spikes * 2 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / (spikes * 2) - Math.PI / 2;
    const radius = index % 2 === 0 ? outer : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");
}

/** Studio — needle-ray sunburst. */
function SunburstShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <polygon points={starPoints(50, 50, 22, 45, 15)} {...lineProps} />
    </svg>
  );
}

/** Finance — woven waffle grid. */
function WaffleShape() {
  const bands = [14, 34, 54, 74];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {bands.map((y) => (
        <rect key={`h${y}`} x="6" y={y} width="88" height="12" rx="6" {...lineProps} />
      ))}
      {bands.map((x) => (
        <rect key={`v${x}`} x={x} y="6" width="12" height="88" rx="6" {...lineProps} />
      ))}
    </svg>
  );
}

/** Rental — triangle raised over a hanging dome, split by the horizon. */
function HorizonShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path d="M8 56H92" {...lineProps} />
      <path d="M24 56 66 12v44Z" {...lineProps} />
      <path d="M34 56a22 22 0 0 0 44 0Z" {...lineProps} />
    </svg>
  );
}

/** Website Admin — spiky star escaping its square frame. */
function FramedStarShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect x="8" y="8" width="70" height="70" {...lineProps} />
      <polygon points={starPoints(52, 52, 12, 40, 20)} {...lineProps} />
    </svg>
  );
}

/** Client Portal — target lens crossed by a meridian. */
function MeridianShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <circle cx="50" cy="50" r="36" {...lineProps} />
      <circle cx="50" cy="50" r="24" {...lineProps} />
      <path d="M50 6v88" {...lineProps} />
    </svg>
  );
}

/** Academy — two offset domes mirrored across the gap. */
function DomesShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path d="M14 46a29 29 0 0 1 58 0Z" {...lineProps} />
      <path d="M28 54a29 29 0 0 0 58 0Z" {...lineProps} />
    </svg>
  );
}

function EyePaths({ irisX = 48, irisY = 52 }: { irisX?: number; irisY?: number }) {
  return (
    <>
      <path d="M8 52Q28 28 48 28q20 0 40 24Q68 76 48 76T8 52Z" {...lineProps} />
      <path d="M20 52q14-14 28-14t28 14Q62 66 48 66T20 52Z" {...lineProps} />
      <circle cx={irisX} cy={irisY} r="11" {...lineProps} />
      <circle cx={irisX} cy={irisY} r="4.5" {...lineProps} />
    </>
  );
}

/** Pak Aldi — eye with a sparkle high right. */
function EyeSparkleHighShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <EyePaths />
      <Sparkle cx={84} cy={16} r={12} />
    </svg>
  );
}

/** Pak Dissa — watchful eye with a plus-star at its side. */
function EyePlusShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <EyePaths irisX={44} irisY={48} />
      <path d="M14 14v20M4 24h20" {...lineProps} />
    </svg>
  );
}

/** Pak Bil — eye with paired sparkles low right. */
function EyeSparkleLowShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <EyePaths />
      <Sparkle cx={82} cy={82} r={11} />
      <Sparkle cx={93} cy={64} r={5} />
    </svg>
  );
}

const SHAPES = [
  SunburstShape,
  WaffleShape,
  HorizonShape,
  FramedStarShape,
  MeridianShape,
  DomesShape,
  EyeSparkleHighShape,
  EyePlusShape,
  EyeSparkleLowShape,
];

export default function ShapeGrid({
  items,
  hoveredIndex,
  selectedIndices,
  onHover,
  onSelect,
  dark,
}: ShapeGridProps) {
  const baseColor = dark ? "#ffffff" : "#171717";

  // Detect if a destination is selected but no user yet
  const hasDestination = selectedIndices.some(
    (idx) => items.find((it) => it.shapeIndex === idx)?.kind === "destination",
  );
  const hasUser = selectedIndices.some(
    (idx) => items.find((it) => it.shapeIndex === idx)?.kind === "user",
  );
  const needsUser = hasDestination && !hasUser;

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-1 sm:gap-x-6 sm:gap-y-2">
      {items.map((item) => {
        const Shape = SHAPES[item.shapeIndex];
        const hovered = hoveredIndex === item.shapeIndex;
        const selected = selectedIndices.includes(item.shapeIndex);
        const active = hovered || selected;
        const anotherHovered = hoveredIndex !== null && !hovered;

        // Pulsing animation for user shapes when destination selected
        const isUser = item.kind === "user";
        const shouldPulse = needsUser && isUser && !selected;
        const pulseDelay = (item.shapeIndex - 6) * 0.4;

        let opacity = hovered ? 1 : selected ? 0.92 : anotherHovered ? 0.11 : 0.24;
        if (shouldPulse) opacity = 0.35;

        return (
          <motion.button
            key={`${item.kind}-${item.id}`}
            type="button"
            aria-label={item.kind === "user" ? `Select user ${item.name}` : `Select ${item.name}`}
            aria-pressed={selected}
            onMouseEnter={() => onHover(item.shapeIndex)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(item.shapeIndex)}
            onBlur={() => onHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item);
            }}
            className="relative flex min-h-[108px] cursor-pointer flex-col items-center justify-start border-0 bg-transparent p-0 outline-none sm:min-h-[122px]"
            animate={{
              opacity,
              scale: hovered
                ? 1.08
                : selected
                  ? 1.025
                  : shouldPulse
                    ? [1, 1.05, 1]
                    : 1,
              color: active ? item.accent : baseColor,
            }}
            transition={
              shouldPulse
                ? {
                    scale: {
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                      delay: pulseDelay,
                    },
                    color: { duration: 0.3 },
                  }
                : { type: "spring", stiffness: 290, damping: 24 }
            }
            style={{
              filter: active
                ? `drop-shadow(0 0 12px ${item.accent}70)`
                : shouldPulse
                  ? `drop-shadow(0 0 8px ${item.accent}50)`
                  : "none",
            }}
          >
            {shouldPulse && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  opacity: [0, 0.08, 0],
                  scale: [0.85, 1.1, 0.85],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                  delay: pulseDelay,
                }}
                style={{
                  background: `radial-gradient(circle, ${item.accent}40 0%, transparent 70%)`,
                }}
              />
            )}
            <div className="relative aspect-square w-[78px] sm:w-[92px]">
              <Shape />
            </div>
            <motion.span
              className="mt-1 max-w-full truncate text-[10px] font-medium tracking-wide sm:text-[11px]"
              animate={{
                opacity: active ? 1 : shouldPulse ? [0.3, 0.8, 0.3] : 0,
                y: active ? 0 : -3,
              }}
              transition={
                shouldPulse
                  ? {
                      opacity: {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: pulseDelay,
                      },
                      y: { duration: 0.2 },
                    }
                  : { duration: 0.2 }
              }
              style={{ color: dark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.68)" }}
            >
              {item.name}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}