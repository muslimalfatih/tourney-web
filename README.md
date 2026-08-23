# tourney-web

Frontend for [tourney.social](https://tourney.social), a tournament platform for
tennis and padel. SvelteKit app with public tournament pages anyone can open,
an organizer area behind a login, and a bracket renderer written from scratch.

- Stack: SvelteKit 2, Svelte 5 in runes mode, TypeScript, Tailwind CSS v4,
  Bits UI primitives, Lucide icons, pnpm
- Data: everything comes from tourney-api over a versioned client. Types are
  generated from `../tourney-api/api/openapi.yaml`
- Hosting: Vercel in production, `adapter-node` everywhere else

## Requirements

Node 24 or newer. `.nvmrc` pins 24.10.0, and `package.json` refuses anything
below 24.

pnpm. Not npm: this project has a pnpm lockfile and a pnpm `node_modules`
layout, and running npm against it produces confusing crashes that look like
npm bugs.

A running [tourney-api](https://github.com/muslimalfatih/tourney-api).

## Quick start

```sh
cp .env.example .env
# Point PUBLIC_API_BASE_URL at your API, including the /api/v1 suffix.

pnpm install
pnpm dev          # http://localhost:5173
```

Sign in at `/login` with the super admin you seeded in tourney-api.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Serve the production build locally |
| `pnpm check` | TypeScript and Svelte diagnostics |
| `pnpm test` | Unit tests for the pure helpers, through `node --test` |
| `pnpm gen:api` | Regenerate API types from `../tourney-api/api/openapi.yaml` |

Browser tests live in the sibling `tourney-e2e` workspace, which starts its own
API and web server on separate ports so it never touches your dev session. Run
them with `npx playwright test` from that directory.

## Rendering model

The public group sets `ssr = false` (`src/routes/(public)/+layout.ts`), so
tournament pages render in the browser and talk to tourney-api directly. Live
scores arrive over SSE on the same connection the page already has, which is
why a scoreboard can update without a round trip through this server.

That leaves one problem: a crawler asking for a public page receives an empty
shell. `src/hooks.server.ts` fixes it. For public tournament paths it asks the
API for the tournament, builds Open Graph and Twitter tags, and injects them
into the shell before the `<!-- tourney:head -->` marker. The API decides what
is visible, so an unpublished tournament returns 404 and the page ships with no
tags at all rather than leaking a draft's name into a link preview.

Two details there are load-bearing. The marker stays in the output after
injection, because removing a comment inside `transformPageChunk` shifts
Svelte's hydration offsets. And a small per-slug cache keeps a burst of crawler
hits from turning into a burst of API calls.

## Routes

`(public)` needs no session:

- `/` the landing page, and `/contact`
- `/tournaments/[slug]` with `/schedule`, `/players`,
  `/matches/[matchId]`, and per-division `/bracket` and `/groups` pages
- `/tournaments/[slug]/present`, a full-screen rotating deck for a venue
  screen. Slides advance on a timer, respond to the keyboard, and pick up
  live scores over SSE

`(admin)` is organizer and super-admin work, gated once in
`(admin)/+layout.server.ts`. `(auth)` holds `/login`.

The gate is for the interface, not for security. Authorization is enforced in
tourney-api, and this app cannot widen it.

## Auth

Tokens never reach browser JavaScript. The login form action stores them in
httpOnly cookies named `tourney_at` and `tourney_rt`.

On every request `hooks.server.ts` reads the access token and validates it
against `/me`. Access tokens expire after 15 minutes, so when one fails the
hook spends the refresh cookie for a new pair and rotates both cookies before
carrying on. Only a dead refresh token produces a signed-out session, which is
why an organizer can leave a tab open all afternoon and still be signed in.

## API client

`src/lib/api/client.ts` wraps fetch, unwraps the `{ data }` and
`{ data, meta }` envelopes, and throws a typed `ApiError` when the API returns
its error envelope. Modules under `src/lib/api/endpoints/` wrap individual
routes. In load functions, pass SvelteKit's own `fetch` and the access token.

Failures carry a machine-readable code, and `src/lib/utils/score-errors.ts` and
`schedule-errors.ts` turn those codes into sentences an organizer can act on.
A double-booked court says which court and which match already holds the slot,
rather than reporting that something went wrong.

## Bracket renderer

`src/lib/components/bracket/` draws brackets with DOM and CSS instead of a
third-party widget, which keeps tennis score formatting, narrow-screen
behaviour and the visual style under our control.

`bracket-adapter.ts` converts the API's flat rounds array into the tree the
components want. The conversion is pure, so a misdrawn bracket can be traced by
feeding the same rounds array back in, with no browser involved.

## Timezones

Every timestamp is stored in UTC and displayed in the tournament's own IANA
timezone, never the viewer's. An organizer in Jakarta and a spectator in Berlin
both read the same start time, the one printed on the draw sheet.
`src/lib/utils/tz.ts` does the conversion. New tournaments default to
Asia/Makassar.

## Theme

`src/routes/layout.css` holds the design tokens in a Tailwind v4 `@theme`
block: near-black grounds, warm off-white text, and a single gold accent that
marks everything interactive. Instrument Serif sets headings, Geist Mono sets
labels and anything numeric.

One rule in that file is easy to trip over. The bare `h1, h2, h3` serif rule is
unlayered, and unlayered CSS beats every Tailwind layer, so it carries a
`:not(.font-mono)` guard. Without the guard a `font-mono` utility on a heading
does nothing.

## Deployment

`vite.config.ts` picks the adapter at build time: `adapter-vercel` on the
`nodejs24.x` runtime when `VERCEL` is set in the environment, `adapter-node`
otherwise. Self-hosting with `pnpm build && node build` keeps working.

Set `PUBLIC_SITE_URL=https://tourney.social` in production. Shared links and
`og:url` are built from it, and when it is empty they fall back to whatever
hostname the browser is on. A preview deployment would otherwise hand out QR
codes pointing at itself.

If you self-host behind `adapter-node`, set `ORIGIN` to your own origin as
well. SvelteKit's CSRF protection rejects form posts without it, so login and
tournament creation return 403. `pnpm dev` handles this on its own.

```sh
pnpm build
ORIGIN=https://your-domain \
  PUBLIC_API_BASE_URL=https://api.your-domain/api/v1 \
  PUBLIC_SITE_URL=https://your-domain \
  node build/index.js
```
