// Shared motion tokens for the gateway. Keep this file the single source of
// truth for curves and durations — call sites import from here, never re-type.

// The project's strong ease-out. Used for entrances, accent shifts, fade-ins.
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Duration scale (seconds). Use the closest named match rather than free-form
// values so the whole app sits in the same register.
export const DURATION = {
  instant: 0.1, // press feedback, color flips
  fast: 0.2, // tooltip / hover swaps
  base: 0.3, // small UI transitions (input, toggles)
  medium: 0.4, // panel entrances, hint text
  slow: 0.55, // modal-scale entrances (rare state changes)
} as const;
