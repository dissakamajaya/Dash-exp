# Agent Context - House of Exp Gateway

## Project Overview

A React single-page gateway for the House of Exp ecosystem. Users select their identity (shape grid), authenticate, then navigate to one of six sub-applications. Deployed on Cloudflare Workers with static asset serving.

## Tech Stack

- **Framework**: React 19 + Vite 7 + TypeScript 5.9
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Animation**: Framer Motion 12
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
│   ├── ShapeGrid.tsx          # 3×3 grid of SVG shapes (6 destinations + 3 users)
│   ├── SoundToggle.tsx        # Audio on/off control
│   └── ThemeToggle.tsx        # Dark/light mode toggle
├── data/
│   └── gateway.ts             # DESTINATIONS, USERS, SELECTOR_ITEMS constants
├── hooks/
│   └── useCuelume.ts          # Sound system hook
├── lib/
│   └── session.ts             # Session types, getSession(), localLogin()
└── utils/
worker/
├── index.ts                   # Cloudflare Worker entry (API routes + asset serving)
├── access.ts                  # Cloudflare Access identity validation
├── local-auth.ts              # Local dev auth (cookie-based sessions)
└── types.ts                   # Shared types (StaffId, WorkerEnv, AuthFailure)
```

## User Flow

1. Gateway loads → checks session via `GET /api/session`
2. If no session → shows auth error or local login form (localhost only)
3. User selects a destination shape (6 apps) and user shape (3 staff)
4. Password input appears → user authenticates
5. Redirect to selected app's production URL

## Authentication Strategy

**Production** (`AUTH_MODE=access`): Cloudflare Access handles auth. Worker reads identity from `Cf-Access-Jwt-Assertion` header.

**Local dev** (`AUTH_MODE=local`): Cookie-based session. `POST /api/session/login` with `{ staffId, password }` returns a signed session cookie. Logout via `POST /api/session/logout`.

The `shouldOfferLocalLogin()` helper in App.tsx detects when to show the local login form based on hostname and error code.

## Applications in Ecosystem

| App | ID | URL | Accent | Status |
|-----|----|-----|--------|--------|
| Studio | `studio` | studio.houseofexp.com | `#a78bfa` | Active |
| Finance | `finance` | finance.houseofexp.com | `#f472b6` | Active |
| Rental | `rental` | rental.houseofexp.com | `#38bdf8` | Coming Soon |
| Website Admin | `admin` | houseofexp.com/edit/ | `#fb923c` | Active |
| Client Portal | `client` | client.houseofexp.com | `#2dd4bf` | Active |
| Academy | `academy` | academy.houseofexp.com | `#facc15` | Coming Soon |

## Staff Users

| Name | ID | Shape | Accent |
|------|----|-------|--------|
| Pak Aldi | `aldi` | Eye + sparkle high-right | `#c084fc` |
| Pak Dissa | `dissa` | Eye + plus-star | `#60a5fa` |
| Pak Bil | `bil` | Eye + sparkles low-right | `#34d399` |

## Design Conventions

- **Shape-based identity**: Each app and user has a unique SVG shape icon (sunburst, waffle grid, horizon, etc.)
- **Accent-reactive UI**: Background mesh gradient, glow effects, and text color shift based on hovered/selected item
- **Dark-first**: Default dark theme with light toggle; palette switches at system level
- **Motion**: Spring-based hover/select animations; pulse animation on user shapes when destination is selected but no user chosen
- **Sound cues**: Each item has a unique cuelume sound; global toggle persists preference
- **Indonesian UI text**: Labels use Bahasa Indonesia ("Masuk", "Buka", "Selamat datang", etc.)
- **Selection persistence**: `localStorage` under key `hox-gateway-selection` stores last `{ appId, userId }`

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
