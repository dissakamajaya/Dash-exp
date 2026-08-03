# Agent Context - House of Exp Gateway

## Project Overview

A React single-page gateway for the House of Exp ecosystem. Users select a destination shape, choose a staff identity from the login form, authenticate, then open one of eight ecosystem applications. Deployed on Cloudflare Workers with static asset serving.

## Tech Stack

- **Framework**: React 19 + Vite 7 + TypeScript 5.9
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Animation**: Motion 12 (via `motion/react`), with `MotionConfig reducedMotion="user"` on every render branch
- **Audio**: cuelume (micro-sound cues on interaction)
- **Auth crypto**: jose (JWT/session handling)
- **Runtime**: Cloudflare Workers (wrangler 4)
- **Package manager**: Bun

## Architecture

```
src/
├── App.tsx                  # Main gateway component (auth, routing, selection state)
├── components/
│   ├── AnimatedBackground.tsx  # Mesh gradient with mouse parallax
│   ├── ShapeGrid.tsx          # Destination SVG buttons backed by a shape registry
│   ├── SoundToggle.tsx        # Audio on/off control
│   └── ThemeToggle.tsx        # Dark/light mode toggle
├── data/
│   └── gateway.ts             # DESTINATIONS, USERS, and storage key
├── hooks/
│   └── useCuelume.ts          # Sound system hook
├── lib/
│   ├── motion.ts              # Shared motion tokens
│   └── session.ts             # Session types, getSession(), localLogin()
└── utils/
worker/
├── index.ts                   # Cloudflare Worker entry (API routes + asset serving)
├── access.ts                  # Cloudflare Access identity validation
├── local-auth.ts              # Local dev auth (cookie-based sessions)
└── types.ts                   # Shared types (StaffId, WorkerEnv, AuthFailure)
```

Implementation plans and their status live in `plans/README.md`.

## User Flow

1. Gateway loads → checks session via `GET /api/session`
2. If no session → shows auth error or local login form (localhost only)
3. User selects a destination shape, then chooses a staff identity in the form
4. Password input appears → user authenticates
5. Active destinations open in a new tab; coming-soon destinations show an in-gateway splash route

## Authentication Strategy

**Production** (`AUTH_MODE=access`): Cloudflare Access handles auth. Worker reads identity from `Cf-Access-Jwt-Assertion` header.

**Local dev** (`AUTH_MODE=local`): Cookie-based session. `POST /api/session/login` with `{ staffId, password }` returns a signed session cookie. Logout via `POST /api/session/logout`.

The `shouldOfferLocalLogin()` helper in App.tsx detects when to show the local login form based on hostname and error code.

## Applications in Ecosystem

| Portal | `portal` | client.houseofexp.com/admin | `#9360eb` | Active |
| Journal | `journal` | finance.houseofexp.com | `#eb609f` | Active |
| Rental | `rental` | rental.houseofexp.com | `#60bfeb` | Coming Soon |
| StudioStaff® | `studiostaff` | studio.houseofexp.com | `#eb9f60` | Active |
| Academy | `academy` | academy.houseofexp.com | `#ebcb60` | Coming Soon |
| Research | `research` | — | `#60ebd0` | Coming Soon |
| House Admin | `admin` | houseofexp.com/edit/ | `#6075eb` | Active |
| CRM | `crm` | crm.houseofexp.com | `#7deb60` | Active |

## Staff Users

| Name | ID | Shape | Accent |
|------|----|-------|--------|
| Pak Aldi | `aldi` | Eye + sparkle high-right | `#c084fc` |
| Pak Dissa | `dissa` | Eye + plus-star | `#60a5fa` |
| Pak Bil | `bil` | Eye + sparkles low-right | `#34d399` |

## Design Conventions

- **Shape-based identity**: Each destination has a unique SVG shape registered by stable string ID in `ShapeGrid.tsx`; staff identity is selected in the login form
- **Accent-reactive UI**: Background mesh gradient, glow effects, and text color shift based on hovered/selected destination
- **Theme**: Default light theme with a dark/light toggle; palette switches at system level
- **Motion**: Spring-based hover/select animations; idle destination icons pulse when nothing is selected
- **Sound cues**: Each item has a unique cuelume sound; global toggle persists preference
- **Indonesian UI text**: Labels use Bahasa Indonesia ("Masuk", "Buka", "Selamat datang", etc.)
- **Selection persistence**: Authenticated sessions persist `localStorage` under key `hox-gateway-selection`; unauthenticated selections remain in memory

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/session` | Return current session identity |
| POST | `/api/session/login` | Local dev login (sets cookie) |
| POST | `/api/session/logout` | Local dev logout (clears cookie) |
| * | `/*` | Serve static assets (SPA fallback) |

## Deployment

```bash
bun run dev          # Vite dev server (frontend only)
bun run dev:auth     # Build + wrangler dev (full Worker + auth)
bun run build        # Production build to dist/
bun run deploy       # Build + wrangler deploy
bun run test         # Vitest
```

Route: `dash.houseofexp.com/*` on zone `houseofexp.com`

## Environment Variables

| Var | Values | Purpose |
|-----|--------|---------|
| `ENVIRONMENT` | `production` / `local` | Toggle local vs Access auth |
| `AUTH_MODE` | `access` / `local` | Auth strategy selector |

Local secrets stored in `.dev.vars` (gitignored). Example in `.dev.vars.example`.
