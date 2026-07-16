import { play } from "cuelume";

interface Props {
  enabled: boolean;
  onToggle: () => void;
  dark: boolean;
}

export default function SoundToggle({ enabled, onToggle, dark }: Props) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        // Play the toggle cue *before* disabling, so turning off still makes a sound.
        play("toggle");
        onToggle();
      }}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      className="fixed right-5 top-[4.25rem] z-50 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-lg transition-colors duration-300"
      style={{
        borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      }}
    >
      {enabled ? (
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
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ) : (
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
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
