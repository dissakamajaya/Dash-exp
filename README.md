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
| 3 | **NAH** | [nah.houseofexp.com](https://nah.houseofexp.com) | `ambient-house` | Active |
| 4 | **Academy** | [academy.houseofexp.com](https://academy.houseofexp.com) | `exp-academy` | Active |
| 5 | **Edit** | [houseofexp.com/edit/](https://houseofexp.com/edit/) | `website` | Active |
| 6 | **Client** | [client.houseofexp.com](https://client.houseofexp.com) | `exp-vault` | Active |
| 7 | **CRM** | [crm.houseofexp.com](https://crm.houseofexp.com) | `exp-crm` | Active |
| 8 | **Command Center** | [cash.houseofexp.com](https://cash.houseofexp.com) | `EXP-Finance-Command-Center` | Active |
| 9 | **Assets** | [assets.houseofexp.com](https://assets.houseofexp.com) | — | Active |

**Research** is available at [research-ops.houseofexp.com](https://research-ops.houseofexp.com). `studiostaff.houseofexp.com`
(V1) and `rental.houseofexp.com` no longer route and must not be used.

### Repository Locations

```
~/Documents/GitHub/
├── Dash-exp/                    # This dashboard (you are here)
├── STUDIOSTAFF V2/              # Studio app
├── STUDIOSTAFF-FINANCE/         # Finance app
├── ambient-house/               # Rental / merch / campaign ops (nah.houseofexp.com)
├── website/                     # Edit/CMS app
├── exp-vault/                   # Client portal
├── exp-crm/                     # CRM
└── EXP-Finance-Command-Center/  # Command Center (planning layer, not a ledger)
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

## Secrets

The ecosystem-wide secret registry lives in [`SECRETS.md`](./SECRETS.md) — every secret
across website / Studio / Finance / CRM / Vault, where it lives, and its rotation date
(values never go in the file). Run `bun run secret-audit` to flag overdue or untracked
rotations (exit 1 when anything is overdue — CI/cron gate).

## License

*To be determined*

## Installable gateway (PWA)

Dash can be installed as **EXP** using **Pasang aplikasi** or the browser's install
menu. On iPhone/iPad, open Dash in Safari and choose **Bagikan → Tambah ke Layar
Utama**. The installed gateway opens ecosystem destinations in the browser; those
apps are separate origins and are not installed or cached by Dash.

`public/manifest.webmanifest` defines the app identity and icons. Regenerate icons
with `python3 scripts/generate-pwa-icons.py`. The manifest uses credentials because
production is protected by Cloudflare Access. Install after signing in; an
installed app may require its own initial login depending on the platform.

`public/sw.js` caches only the data-free offline notice. All navigation stays
network-first without storing HTML, and APIs, authentication endpoints, and other
origins are never intercepted. Offline mode displays a reconnect action; it does
not grant access to staff data or queue writes. Access session expiration and
revocation remain enforced online. `_headers` makes PWA metadata and scripts
revalidate. Browser QA should use a production build and the global Stagehand
runner; verify service-worker activation, offline/reconnect, and install controls.
