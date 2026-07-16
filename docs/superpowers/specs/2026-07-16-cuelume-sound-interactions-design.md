# House of EXP Gateway Sound Interactions

## Goal

Add a musical, branded sound layer to the existing House of EXP gateway using `cuelume@0.1.2`. Sound reinforces the existing visual interactions without becoming required for navigation or state comprehension.

## Scope

Included:

- Sound feedback for shape hover, press, release, app selection, user selection, theme switching, sound switching, form submission, and the coming-soon reveal.
- A visible sound on/off control with a locally persisted preference.
- One centralized cue map for destinations and users.
- Browser-safe fallback when Web Audio is unavailable or blocked.

Excluded:

- Real cross-app authentication and token exchange. This remains the explicit TODO in `src/App.tsx` and is deferred until the authentication phase.
- Custom audio samples, custom synthesis, or a volume slider. Cuelume synthesizes its palette and exposes only enabled/disabled preference control.
- Changes to the intentionally deferred Rental and Academy applications.

## Package Contract

Install with:

```sh
npm install cuelume
```

The package is ESM-only, has zero runtime dependencies, and exposes:

```ts
import { bind, play, setEnabled, type SoundName } from "cuelume";
```

- `bind(root?)` installs idempotent delegated listeners for `data-cuelume-*` attributes.
- `play(name?)` plays one of fourteen built-in recipes.
- `setEnabled(value)` controls future playback but does not persist preference or stop active sounds.
- Import and binding are SSR-safe. Playback silently no-ops when Web Audio is unavailable, blocked, disabled, or has not received user activation.

## Architecture

### Sound preference hook

Create one focused hook that owns Cuelume lifecycle and user preference:

- Call `bind()` once after the React app mounts.
- Read `hox-sound-enabled` from `localStorage`; default to enabled when unset.
- Call `setEnabled(enabled)` whenever the preference changes.
- Persist changes to `localStorage` when available.
- Return `enabled` and a toggle callback to the UI.

The hook does not expose a volume value because Cuelume has no gain API.

### Sound control

Add a sound toggle next to the existing theme toggle. It uses a clear speaker/speaker-off icon, an accessible label, and `data-cuelume-toggle`. Because disabling sound prevents future playback, the control plays its toggle cue before applying the disabled state when turning sound off.

### Cue ownership

Store app and user selection cues in `src/data/gateway.ts` as typed `SoundName` values. Generic button mechanics remain declarative through `data-cuelume-*` attributes. State-dependent cues use `play()` in the existing selection and submit handlers.

This keeps the SVG components visual and keeps audio decisions beside the domain items they describe.

## Interaction Score

### Generic shape mechanics

| Event | Cue | Notes |
|---|---|---|
| Mouse hover | `whisper` | Mouse/fine-pointer only; Cuelume throttles globally to one sound per 150 ms. |
| Pointer down | `press` | Tactile down-state. |
| Pointer up | `release` | Tactile return-state. |

### Destination selection

| Destination | Cue |
|---|---|
| Studio | `sparkle` |
| Finance | `tick` |
| Rental | `droplet` |
| Website Admin | `page` |
| Client Portal | `bloom` |
| Academy | `chime` |

### User selection

| User | Cue |
|---|---|
| Aldi | `chime` |
| Dissa | `ready` |
| Bil | `sparkle` |

### Global actions

| Action | Cue |
|---|---|
| Theme toggle | `toggle` |
| Sound toggle | `toggle` |
| Login submit | `loading` |
| Coming-soon reveal or active-app handoff | `success` |
| Future authentication failure | `error` |

The submit flow plays `loading` immediately. The existing 650 ms transition then plays `success` just before the hash reveal or external redirect, allowing the resolving cue to begin before navigation unloads the page.

## Accessibility and Failure Behavior

- Sound is supplemental. Visible labels, selected styles, button states, loading copy, and route behavior remain authoritative.
- Native buttons retain keyboard semantics.
- Cuelume toggle events include keyboard and touch activation. Hover cues remain mouse-only.
- Muted preference survives reloads in the same browser.
- Storage failures, unsupported Web Audio, autoplay restrictions, or audio-context resume failures never block selection, submission, or navigation.
- No repeated background audio, autoplay on page load, or hover-only essential feedback is introduced.

## Existing TODO Audit

- `src/App.tsx`: real authentication/session exchange before redirect is the only explicit code TODO. It remains deferred by current product direction.
- Rental and Academy are deliberately marked `comingSoon` and correctly render the in-page “Segera hadir” state.
- `README.md` overstates password authentication and centralized access control; it also contains stale Tech Stack, Development, and License placeholders.
- `AGENTS.md` contains deferred Technical Decisions, Authentication Strategy, and Conventions placeholders.
- Documentation cleanup is separate from the sound feature; no TODO is silently treated as implemented.

## Verification

1. Run TypeScript checking and the production Vite build.
2. Launch the local gateway and exercise it in a real browser.
3. Confirm hover, press, release, app selection, user selection, theme toggle, submit, and coming-soon cues after a user gesture.
4. Confirm each destination and user resolves to its declared cue.
5. Disable sound, reload, and verify the muted preference persists and all interactions still work.
6. Re-enable sound and verify cues resume.
7. Verify keyboard activation of the theme and sound controls.
8. Verify the active-app redirect and Rental/Academy coming-soon paths remain unchanged.
