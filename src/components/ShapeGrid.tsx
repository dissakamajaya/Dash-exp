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

function StarburstShape() {
  const points = Array.from({ length: 28 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 28 - Math.PI / 2;
    const radius = index % 2 === 0 ? 35 : 22;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
  return <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true"><polygon points={points} {...lineProps} /></svg>;
}

function MonogramShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <circle cx="37" cy="50" r="31" {...lineProps} />
      <path d="M51 19h17c11 0 18 7 18 17S79 53 68 53H51" {...lineProps} />
      <path d="M51 19v62M65 53l22 28" {...lineProps} />
      <circle cx="37" cy="50" r="13" {...lineProps} />
    </svg>
  );
}

function MatrixShape() {
  const activeDots = new Set([0, 2, 4, 6, 8]);
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => {
          const index = row * 3 + col;
          const x = 14 + col * 27;
          const y = 16 + row * 26;
          return (
            <g key={index}>
              <rect x={x} y={y} width="22" height="19" rx="8" {...lineProps} />
              {activeDots.has(index) && <circle cx={x + 11} cy={y + 9.5} r="2.8" fill="currentColor" />}
            </g>
          );
        }),
      )}
    </svg>
  );
}

function RosetteShape() {
  const points = Array.from({ length: 144 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 144 - Math.PI / 2;
    const radius = 29 + 5 * Math.sin(angle * 12);
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <polygon points={points} {...lineProps} />
      <circle cx="50" cy="50" r="17" {...lineProps} opacity="0.55" />
    </svg>
  );
}

function SplitPortalShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect x="14" y="20" width="72" height="60" rx="15" {...lineProps} />
      <path d="M50 20v60" {...lineProps} />
      <path d="M50 22c-10 8-12 17-5 28s5 21-5 29" {...lineProps} />
      <path d="M50 22a28 28 0 0 0 0 56" {...lineProps} />
    </svg>
  );
}

function GeometricShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect x="20" y="20" width="60" height="60" rx="10" transform="rotate(45 50 50)" {...lineProps} />
      <circle cx="50" cy="50" r="20" {...lineProps} />
      <line x1="50" y1="12" x2="50" y2="88" {...lineProps} />
    </svg>
  );
}

function LayeredPanelShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect x="13" y="23" width="74" height="54" rx="18" {...lineProps} />
      <path d="M13 45h74M13 58h74" {...lineProps} />
      <circle cx="31" cy="34" r="6" {...lineProps} />
      <circle cx="50" cy="34" r="6" {...lineProps} />
      <circle cx="69" cy="34" r="6" {...lineProps} />
    </svg>
  );
}

function EyeShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path d="M14 50c10-19 23-28 36-28s26 9 36 28c-10 19-23 28-36 28S24 69 14 50Z" {...lineProps} />
      <circle cx="50" cy="50" r="16" {...lineProps} />
      <circle cx="50" cy="50" r="7" {...lineProps} />
    </svg>
  );
}

function EyeSparkleShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <path d="M13 43c10-17 22-25 36-25s26 8 36 25c-10 17-22 25-36 25S23 60 13 43Z" {...lineProps} />
      <circle cx="49" cy="43" r="13" {...lineProps} />
      <circle cx="49" cy="43" r="5" {...lineProps} />
      <path d="M78 62v18M69 71h18M72 65l12 12M84 65 72 77" {...lineProps} />
      <circle cx="78" cy="71" r="2" fill="currentColor" />
    </svg>
  );
}

const SHAPES = [
  StarburstShape,
  MonogramShape,
  MatrixShape,
  RosetteShape,
  SplitPortalShape,
  GeometricShape,
  LayeredPanelShape,
  EyeShape,
  EyeSparkleShape,
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