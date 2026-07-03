# laga-web

Frontend for **Laga**, a white-label tennis tournament platform. SvelteKit app
with SSR public pages, an auth-gated admin area, and a custom Svelte bracket
renderer.

- **Stack:** SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS v4 ·
  shadcn-style UI on Bits UI primitives · Lucide icons · pnpm
- **Runtime:** Node (`@sveltejs/adapter-node`) — SSR, deployed independently of
  laga-api
- **Contract:** consumes laga-api over a versioned client; types generated from
  `laga-api/api/openapi.yaml`

## Requirements

- Node 20+ (repo developed on Node 24)
- pnpm 10+
- A running [laga-api](https://github.com/muslimalfatih/laga-api) instance

## Quick start

```sh
cp .env.example .env
# Set PUBLIC_API_BASE_URL to your laga-api (default http://localhost:8080/api/v1)

pnpm install
pnpm dev          # http://localhost:5173
```

Sign in at `/login` with the super admin you seeded in laga-api.

### Production (adapter-node)

```sh
pnpm build
# adapter-node needs ORIGIN set so its CSRF protection recognises form POSTs:
ORIGIN=https://your-domain PUBLIC_API_BASE_URL=https://api.your-domain/api/v1 \
  node build/index.js
```

Without `ORIGIN`, form actions (login, create tournament) are rejected with 403
by SvelteKit's CSRF guard. In `pnpm dev` this is handled automatically.

## Scripts

| Script         | What it does                                             |
| -------------- | ------------------------------------------------------- |
| `pnpm dev`     | Dev server                                              |
| `pnpm build`   | Production build (adapter-node)                         |
| `pnpm preview` | Preview the production build                            |
| `pnpm check`   | Type + Svelte diagnostics                               |
| `pnpm gen:api` | Regenerate API types from `../laga-api/api/openapi.yaml` |

## Architecture

### Route groups

- `(public)` — SSR tournament pages (`/`, `/tournaments/[slug]`, `/bracket`,
  `/schedule`, `/participants`, `/matches/[matchId]`). No auth. Load functions
  fetch from laga-api on the server.
- `(admin)` — organizer and super-admin areas behind a single role gate
  (`(admin)/+layout.server.ts`). The API enforces authorization independently.
- `(auth)` — `/login`. A form action authenticates against laga-api and stores
  tokens in **httpOnly cookies**.

### Auth

Tokens never touch browser JS. `login` sets httpOnly cookies; `hooks.server.ts`
reads the access token on each request, validates it via `/me`, and attaches the
session to `event.locals`. Server-side API calls forward the token as a Bearer
header. Frontend role checks are UX only — the API is the authority.

### API client

`src/lib/api/client.ts` is an isomorphic fetch wrapper that unwraps the
`{ data }` / `{ data, meta }` envelope and throws a typed `ApiError` on the
error envelope. Endpoint modules (`src/lib/api/endpoints/*`) wrap specific
routes. Pass SvelteKit's `fetch` and the access token in load functions.

### Custom bracket renderer

`src/lib/components/bracket/` is a DOM/CSS bracket — **not** a third-party
widget — so branding, tennis score formatting, responsive behaviour and future
padel support stay under our control:

- `Bracket.svelte` — horizontal, scrollable round columns
- `RoundColumn.svelte` — a round of match cards, evenly distributed
- `MatchCard.svelte` — two-slot card with per-set scores, seeds, live badge,
  subtle winner emphasis

A `sample.ts` placeholder renders until the backend draw endpoint returns real
data.

### Theme

`src/routes/layout.css` maps the Laga dark palette into Tailwind v4 `@theme`
tokens (`bg-surface`, `text-secondary`, `text-accent`, …). White-label branding
can override accent tokens per tournament later.

## Contract sync

`pnpm gen:api` reads the sibling `../laga-api/api/openapi.yaml` and writes
`src/lib/api/generated/types.ts`. For the skeleton, hand-authored types in
`src/lib/api/types.ts` are the single import surface; swap them for the generated
types as the spec stabilises.
