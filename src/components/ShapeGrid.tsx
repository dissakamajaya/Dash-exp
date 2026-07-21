import { motion } from "motion/react"
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

/** Studio — vertical beam structure (was: needle-ray sunburst). */
function SunburstShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <g transform="translate(-0.000 1.513) scale(0.14286)">
        <path d="M458.087 7.07812C472.116 7.07812 484.17 18.0152 483.061 31.9307V31.9316C480.81 60.1414 477.048 112.986 477.048 150.81V428.27C477.048 466.093 480.81 518.938 483.061 547.147L483.103 547.798C483.792 561.402 471.898 571.999 458.089 572H437.533C425.018 572 413.797 563.271 412.795 550.886C410.585 523.576 406.514 467.907 406.514 428.27V150.81C406.514 111.172 410.585 55.5006 412.795 28.1914L412.85 27.6133C414.149 15.5354 425.214 7.07828 437.533 7.07812H458.087ZM79.1553 5C96.2231 5.00054 109.284 21.0327 103.104 36.9453C91.7374 66.218 75.5333 114.161 75.5332 148.73C75.5333 174.604 84.635 194.826 94.2441 216.032C103.792 237.102 113.847 259.158 113.847 287.462C113.846 315.765 103.791 337.82 94.2441 358.89C84.6351 380.096 75.5334 400.317 75.5332 426.19C75.5332 460.76 91.7373 508.704 103.104 537.977C109.283 553.889 96.223 569.921 79.1553 569.922H61.6797C51.8807 569.922 42.5941 564.566 38.8662 555.587C33.6815 543.098 25.2425 521.596 18.0928 497.876C10.9713 474.25 5 448.013 5 426.19C5.00019 397.887 15.0552 375.833 24.6025 354.763C34.2116 333.557 43.3132 313.335 43.3135 287.462C43.3135 261.589 34.2116 241.366 24.6025 220.16C15.0551 199.09 5.00006 177.034 5 148.73C5.00005 126.907 10.9713 100.671 18.0928 77.0449C25.2425 53.3249 33.6816 31.8226 38.8662 19.334C42.5942 10.3549 51.8808 5.00014 61.6797 5H79.1553ZM172.534 5C188.856 5 201.772 19.6957 196.903 35.2676C187.811 64.3466 174.38 113.404 174.38 148.73C174.38 174.84 181.732 195.223 189.405 216.393C197.056 237.5 205.029 259.394 205.029 287.462C205.029 315.53 197.056 337.423 189.405 358.53C181.732 379.699 174.38 400.081 174.38 426.19C174.38 461.517 187.811 510.575 196.903 539.654C201.772 555.226 188.855 569.922 172.534 569.922H153.931C143.514 569.922 133.739 563.888 130.495 554.062C122.106 528.655 103.847 468.606 103.847 426.19C103.847 398.123 111.82 376.229 119.471 355.122C127.144 333.953 134.496 313.571 134.496 287.462C134.496 261.353 127.144 240.969 119.471 219.8C111.82 198.693 103.847 176.798 103.847 148.73C103.847 106.315 122.107 46.2669 130.495 20.8594C133.739 11.0337 143.514 5.00033 153.931 5H172.534ZM252.808 5C263.224 5.00013 273.001 11.0331 276.245 20.8594C284.634 46.2669 302.893 106.315 302.894 148.73C302.894 176.314 298.982 197.846 295.15 218.988C291.32 240.123 287.568 260.868 287.568 287.462C287.568 314.056 291.32 334.8 295.15 355.935C298.982 377.076 302.893 398.608 302.894 426.19C302.894 468.606 284.634 528.655 276.245 554.062C273.001 563.889 263.224 569.922 252.808 569.922H234.206C217.885 569.922 204.968 555.226 209.837 539.654C218.929 510.575 232.36 461.517 232.36 426.19C232.36 399.596 228.608 378.852 224.777 357.718C220.945 336.576 217.035 315.045 217.035 287.462C217.035 259.879 220.945 238.346 224.777 217.204C228.608 196.069 232.36 175.325 232.36 148.73C232.36 113.404 218.929 64.3467 209.837 35.2676C204.968 19.6956 217.885 5 234.206 5H252.808ZM370.775 5C386.344 5 399.028 18.4144 395.46 33.5312C388.651 62.3766 378.201 112.614 378.201 148.73C378.201 175.571 380.097 196.511 382.013 217.645C383.929 238.787 385.864 260.125 385.864 287.462C385.864 314.798 383.929 336.135 382.013 357.277C380.097 378.411 378.201 399.35 378.201 426.19C378.201 462.307 388.651 512.545 395.46 541.391C399.028 556.508 386.344 569.922 370.775 569.922H351.273C340.182 569.922 329.911 563.05 327.284 552.372C320.858 526.25 307.668 467.674 307.668 426.19C307.668 398.854 309.604 377.517 311.52 356.375C313.435 335.242 315.33 314.302 315.33 287.462C315.33 260.621 313.435 239.681 311.52 218.547C309.604 197.404 307.668 176.067 307.668 148.73C307.668 107.246 320.858 48.6706 327.284 22.5488C329.911 11.8707 340.182 5.00014 351.273 5H370.775ZM539.914 5C550.33 5.00019 560.107 11.0331 563.352 20.8594C571.74 46.267 590 106.315 590 148.73C590 171.982 587.225 190.912 584.056 208.965C580.877 227.073 577.363 244.023 575.676 263.904C574.536 277.339 563.521 288.436 549.574 288.437H529.873C515.84 288.437 503.973 276.937 505.228 262.483C506.99 242.179 510.617 224.671 513.717 206.985C516.826 189.242 519.467 171.032 519.467 148.73C519.467 113.404 506.036 64.3467 496.943 35.2676C492.075 19.6962 504.989 5.00081 521.31 5H539.914Z" {...lineProps} />
      </g>
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

/** Academy — cog/gear with offset inner teeth (was: two offset domes). */
function DomesShape() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <g transform="translate(0.000 13.168) scale(0.01819)">
        <path d="M3472.48 0C4590.79 0 5497.37 906.558 5497.37 2024.86C5497.37 3143.15 4590.79 4049.71 3472.48 4049.71H2024.89C906.575 4049.71 0 3143.15 0 2024.86C0 906.558 906.576 0 2024.89 0H3472.48ZM3082.27 867.605C2979.39 541.564 2517.99 541.564 2415.1 867.605L2408.21 889.431C2348.81 1077.74 2138.22 1171.85 1958.29 1090.51L1647.54 950.033C1396.07 836.357 1169.59 1148.54 1352.15 1355.5C1484.19 1505.19 1400.39 1742.67 1203.34 1774.53C919.211 1820.49 919.211 2229.22 1203.34 2275.18C1400.39 2307.04 1484.19 2544.53 1352.15 2694.21C1169.59 2901.16 1396.07 3213.35 1647.54 3099.68L1958.29 2959.2C2138.22 2877.86 2348.81 2971.97 2408.21 3160.27L2415.1 3182.11C2517.99 3508.15 2979.39 3508.15 3082.27 3182.11L3089.16 3160.27C3148.56 2971.97 3359.15 2877.86 3539.08 2959.2L3849.83 3099.68C4101.3 3213.35 4327.78 2901.16 4145.22 2694.21C4013.18 2544.53 4096.99 2307.04 4294.03 2275.18C4578.16 2229.22 4578.16 1820.49 4294.03 1774.53C4096.99 1742.67 4013.18 1505.19 4145.22 1355.5C4327.78 1148.54 4101.3 836.357 3849.83 950.033L3539.08 1090.51C3359.15 1171.85 3148.56 1077.74 3089.16 889.431L3082.27 867.605Z" {...lineProps} />
      </g>
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
            data-cuelume-hover="tick"
            data-cuelume-press
            data-cuelume-release
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
              className="mt-1 max-w-full truncate text-[10px] font-medium sm:text-[11px]"
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