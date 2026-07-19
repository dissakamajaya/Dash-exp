# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-07-18

First tagged release. The gateway is live at `dash.houseofexp.com`, routing authenticated staff to six ecosystem apps.

### Added

- Shape-grid identity picker: 6 destinations + 3 staff users on a 3×3 SVG grid, with accent-reactive background and hover/select spring animations.
- Cloudflare Access SSO in production; cookie-based local login for `localhost` (`AUTH_MODE=local`) gated by `shouldOfferLocalLogin()`. ([#2](https://github.com/dissakamajaya/Dash-exp/pull/2))
- Cloudflare Worker at `dash.houseofexp.com/*` serving static assets and `/api/session*` endpoints. ([#3](https://github.com/dissakamajaya/Dash-exp/pull/3))
- Animated liquid gradient background with mouse parallax and grain texture ([#4](https://github.com/dissakamajaya/Dash-exp/pull/4)); fluid-gradient board palette applied on top.
- Reduced-motion accessibility via `<MotionConfig reducedMotion="user">` on every render branch. ([#1](https://github.com/dissakamajaya/Dash-exp/pull/1))
- Selection-hint copy that reacts to partial selections ("Sekarang pilih siapa kamu" / "Sekarang pilih aplikasi tujuan" / "Pilih aplikasi & siapa kamu untuk masuk").
- Sound cues (`cuelume`) with a persisted on/off toggle.
- Selection persistence in `localStorage` under `hox-gateway-selection`.

### Changed

- Animation library: `framer-motion` → `motion@12`, imports via `motion/react`. ([#1](https://github.com/dissakamajaya/Dash-exp/pull/1))
- Layout-prop form reveal (`height` / `marginTop`) replaced with compositor-only `opacity` + `y`. ([#1](https://github.com/dissakamajaya/Dash-exp/pull/1))
- `min-h-screen` → `min-h-dvh` across all gateway shells; toggles moved to `size-10`; `tracking-*` overrides dropped; `text-balance` / `text-pretty` applied to headings and body copy. ([#1](https://github.com/dissakamajaya/Dash-exp/pull/1))
- Client portal target redirected to `/admin` for the Cloudflare Access SSO flow.

### Fixed

- Password placeholder translated `"Password"` → `"Kata sandi"` — the last untranslated string in an otherwise fully-Indonesian surface. ([#1](https://github.com/dissakamajaya/Dash-exp/pull/1))

### Chore

- Restored `dev:auth`, `test`, `deploy` scripts and `wrangler`, `vitest`, `@cloudflare/workers-types` devDependencies that a mis-resolved rebase of #1 had dropped.
- Renamed package `react-vite-tailwind` → `hox-gateway`.
- Version bumped `0.0.0` → `0.1.0`.
