import { motion } from "motion/react"

interface Props {
  dark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-label="Toggle theme"
      data-cuelume-toggle
      className="fixed right-5 top-5 z-50 flex size-10 items-center justify-center rounded-full border backdrop-blur-lg transition-colors duration-300"
      style={{
        borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      }}
    >
      <motion.div
        animate={{ rotate: dark ? 0 : 180 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {dark ? (
          /* Moon */
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={dark ? "#fff" : "#1a1a1a"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
          </svg>
        ) : (
          /* Sun */
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </motion.div>
    </button>
  );
}
