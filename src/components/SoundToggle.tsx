import { play } from "cuelume";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        // Play the toggle cue *before* disabling, so turning off still makes a sound.
        play("toggle");
        onToggle();
      }}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      title={enabled ? "Matikan suara" : "Nyalakan suara"}
      className="ctl ctl-icon"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {enabled ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        )}
      </svg>
    </button>
  );
}
