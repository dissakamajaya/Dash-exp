# House of Exp - Ecosystem Dashboard

Landing page for the House of Exp ecosystem applications.

## Overview

This dashboard serves as the central navigation hub for all House of Exp applications, providing authenticated access to different platforms based on user roles.

## Applications

The ecosystem includes the following applications:

| # | App | URL | Repository | Status |
|---|-----|-----|------------|--------|
| 1 | **Studio** | [studio.houseofexp.com](https://studio.houseofexp.com) | `STUDIOSTAFF V2` | Active |
| 2 | **Finance** | [finance.houseofexp.com](https://finance.houseofexp.com) | `STUDIOSTAFF-FINANCE` | Active |
| 3 | **Rental** | [rental.houseofexp.com](https://rental.houseofexp.com) | - | Coming Soon |
| 4 | **Academy** | [academy.houseofexp.com](https://academy.houseofexp.com) | - | Coming Soon |
| 5 | **Edit** | [houseofexp.com/edit/](https://houseofexp.com/edit/) | `website` | Active |
| 6 | **Client** | [client.houseofexp.com](https://client.houseofexp.com) | `exp-vault` | Active |

### Repository Locations

```
~/Documents/GitHub/
├── Dash-exp/                    # This dashboard (you are here)
├── STUDIOSTAFF V2/              # Studio app
├── STUDIOSTAFF-FINANCE/         # Finance app
├── website/                     # Edit/CMS app
└── exp-vault/                   # Client portal
```

## Users

Authorized users:
- Aldi
- Dissa
- Bil

## Features

- User selection
- Password authentication
- Quick navigation to ecosystem apps
- Centralized access control

## Tech Stack

- **Framework**: React 19 + Vite 7 + TypeScript 5.9
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Animation**: Motion 12 (`motion/react`) with `MotionConfig reducedMotion="user"`
- **Audio**: cuelume (micro-sound cues)
- **Auth crypto**: `jose` (JWT/session)
- **Runtime**: Cloudflare Workers (wrangler 4) — served at `dash.houseofexp.com/*`
- **Package manager**: Bun

## Development

```bash
bun install

bun run dev          # Vite dev server (frontend only)
bun run dev:auth     # Build + wrangler dev (full Worker + auth)
bun run build        # Production build to dist/
bun run test         # Vitest
bun run deploy       # Build + wrangler deploy
```

Local dev auth uses cookie-based sessions (`AUTH_MODE=local`); production uses Cloudflare Access SSO (`AUTH_MODE=access`). Local secrets live in `.dev.vars` (gitignored); see `.dev.vars.example`.

See [`AGENTS.md`](./AGENTS.md) for architecture, API routes, and design conventions.

## License

*To be determined*
