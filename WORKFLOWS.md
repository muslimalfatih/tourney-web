# Laga — Workflows & Design Tokens

Reference for the current implemented flows (login → create → edit) with the
edge cases each one already handles, plus the complete design-token system.

---

## 1. Auth & session

Two httpOnly cookies drive auth: `access_token` (~15 min) and `refresh_token`
(long-lived).

### Login — `(auth)/login/+page.server.ts`
- Submit email + password → laga-api → cookies set.
- Success → redirect by role: `super_admin` → `/super-admin`, else → `/organizer`.

### Session resolution — `hooks.server.ts` (runs every request)
1. `access_token` valid → attach `locals.session.user`.
2. Access expired → exchange `refresh_token` for a fresh pair, **rotate both
   cookies**, retry. User stays signed in transparently.
3. Refresh dead → clear cookies, unauthenticated.

### Route guard — `(admin)/+layout.server.ts`
No `session.user` → `redirect(303, /login?redirect=<path>)`. Every admin load
forwards `accessToken` to laga-api as bearer.

**Edge cases handled**

| Case | Behavior |
| --- | --- |
| Already logged in visits `/login` | Bounced to dashboard |
| Missing email/password | `400` "Email and password are required." |
| Bad credentials | `401` "Invalid email or password." |
| Access token expired | Silent refresh + cookie rotation |
| Deep-link while logged out | Login then return via `?redirect=` |

---

## 2. Organizer

### Create tournament (two paths)

| Path | Fields | Validation | Result |
| --- | --- | --- | --- |
| Modal (`tournaments` `?/create`) | name, location, starts_on, ends_on | name required (`400`); dates optional; `sport: 'tennis'` fixed | toast "Tournament created" |
| Full page (`tournaments/new`) | name, **slug**, location | name + slug required (`400`) | `redirect(303)` to new tournament (navigates, no toast) |

### Manage tournament — `tournaments/[id]`
- **publish / unpublish** — exposes/hides public roster + bracket → "Status updated".
- **addEvent** — name (required), discipline `singles|doubles`, format
  `single_elim|round_robin|group_knockout` → "Event added".
- **deleteEvent** → "Event removed".
- Load errors: `404` "Tournament not found", else `502`.

### Event — `events/[id]` (Overview / Match Builder / Bracket / Participants)

**Participants**
- **add** — name required; singles creates a player, doubles a team → "…added";
  input refocuses for rapid entry.
- **rename** — inline edit-in-place; syncs `participants.display_name` + the
  underlying `players`/`teams` name (one tx) → "Name updated".
- **delete** → "Removed".

**Draw**
- **Match Builder** (single-elim only): **Auto** (random pairs) or **Manual**
  (pick round 1). Manual edge cases: a half-filled match blocks save; unassigned
  players warned but save allowed; empty slots become byes; rebuilding over an
  existing draw asks to confirm "replace" → "Bracket built".
- **Generate** (round-robin / group-knockout): format-agnostic generator → "Draw
  generated".
- Guard: **< 2 participants** disables build/generate with an inline hint.

**Bracket tab** (click a match → panel)
- **markLive** → "Match started".
- **score** — Save progress vs Complete match (advances winner) →
  "Score saved" / "Match completed" (distinguished by the `complete` flag).
- **schedule** — court + start time → "Schedule saved".

### Schedule — `tournaments/[id]/schedule`
- **addCourt** — name required → "Court added".
- **addSlot** — court + start time required; invalid date `400` → "Match scheduled".
- **deleteSlot** → "Slot removed".

---

## 3. Super-admin
- **create organizer** — org_name + organizer_name + email + password
  (**all required, password ≥ 8 chars**) → "Organizer added".
- **oversight** — `suspend | archive | restore` any tournament → "Tournament updated".

---

## 4. Cross-cutting behavior
- **Every mutation** → success + error toast (top-right, themed) via the shared
  `toastEnhance` helper; the server's real error message is surfaced.
- **Load failures degrade gracefully**: list loads catch → empty array (never a
  crash page); detail loads → `404` / `502`.
- **Inline forms**: no full-page reloads; `use:enhance` + `invalidateAll`.
- **Public read model** is gated on the tournament being published.

---

## 5. Design tokens

Light-only burgundy system, defined in `src/routes/layout.css` `@theme`. Dark
mode is intentionally absent — the product commits to a single premium surface.
White-label branding overrides accent tokens per tournament via inline CSS
custom properties.

### Grounds & surfaces

| Token | Value | Role |
| --- | --- | --- |
| `--color-page` | `#fbf6f7` | App background |
| `--color-surface` | `#ffffff` | Cards, sheets, toasts |
| `--color-subtle` | `#f3e9ec` | Hover fills, muted rows |
| `--color-border` | `rgba(143, 24, 58, 0.14)` | Hairline borders (burgundy-tinted) |

### Text

| Token | Value | Role |
| --- | --- | --- |
| `--color-primary` | `#2b0a12` | Primary text |
| `--color-muted` | `rgba(46, 10, 18, 0.7)` | Secondary text |
| `--color-on-accent` | `#ffffff` | Text on accent fills |

### Accents (locked brand anchor)

| Token | Value | Role |
| --- | --- | --- |
| `--color-accent` | `#8f183a` | Brand burgundy; primary actions, success voice |
| `--color-accent-hover` | `#7a1230` | Button hover |
| `--color-accent-soft` | `#d98a99` | Bracket connectors, scrollbars |
| `--color-gold` | `#e1b869` | Seeds / byes / special badges only |

### Semantic (separate from brand hues)

| Token | Value | Role |
| --- | --- | --- |
| `--color-danger` | `#b3261e` | Errors, destructive actions |

### Radii

| Token | Value |
| --- | --- |
| `--radius-lg` | `18px` |
| `--radius-md` | `12px` |
| `--radius-pill` | `999px` |

### Shadows

| Token | Value | Role |
| --- | --- | --- |
| `--shadow-subtle` | `0 8px 25px rgba(0,0,0,0.08)` | Cards, chips |
| `--shadow-soft` | `0 18px 40px rgba(0,0,0,0.16)` | Modals, menus, big surfaces |

### Type

| Token | Value | Role |
| --- | --- | --- |
| `--font-display` | `'Zodiak', Georgia, serif` | Headings, `.font-display` |
| `--font-body` | `'Satoshi', system-ui, …` | Body (global default) |

### Motion (added for the Apple-design pass)
- `data-state` keyframes for overlay / modal / menu materialize (scale + opacity).
- Popovers grow from their trigger via `--bits-floating-transform-origin`.
- Toast sizing + per-type icon color via sonner's own CSS vars.
- All motion is `prefers-reduced-motion` aware (cross-fade fallback).

### Utility classes
- `.font-display` — display face.
- `.tabular` — `font-variant-numeric: tabular-nums` (aligned digits).
- `.bracket-scroll` — thin on-theme scrollbars for the horizontal bracket.
- `.motion-overlay` / `.motion-modal` / `.motion-menu` — enter animations for
  bits-ui portalled content.
