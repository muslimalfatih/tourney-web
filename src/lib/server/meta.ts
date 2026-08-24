// Phase 4B: link-preview metadata for the client-first public pages.
//
// The public UI renders in the browser (ssr=false), so crawlers fetching a
// tournament URL get the bare app shell. hooks.server.ts fills that gap with
// the approved metadata-only transformPageChunk strategy: for public
// tournament paths it asks the Go API (the visibility authority — drafts and
// hidden tournaments 404 there) for the tournament, builds the tags here, and
// injects them into the shell's <head>. No page rendering moves to the server.

/** Parsed public tournament path, or null for everything else. */
export interface TournamentPath {
	slug: string;
	/** Trailing section: '' | 'schedule' | 'players' | 'bracket' | 'groups' | 'matches' … */
	section: string;
}

export function tournamentPathInfo(pathname: string): TournamentPath | null {
	const m = pathname.match(/^\/tournaments\/([^/]+)(?:\/(.*))?$/);
	if (!m) return null;
	const rest = (m[2] ?? '').replace(/\/$/, '');
	const parts = rest === '' ? [] : rest.split('/');
	// /tournaments/slug            -> ''
	// /tournaments/slug/schedule   -> 'schedule'
	// /tournaments/slug/div/bracket-> 'bracket'
	// /tournaments/slug/matches/id -> 'matches'
	const section = parts.length === 0 ? '' : parts.length === 1 ? parts[0] : parts[0] === 'matches' ? 'matches' : parts[1];
	return { slug: m[1], section };
}

const SECTION_LABEL: Record<string, string> = {
	schedule: 'Schedule',
	players: 'Players',
	bracket: 'Bracket',
	groups: 'Group standings',
	matches: 'Match'
};

/**
 * Title + description for the static public pages (home, contact) — the ones
 * with no API-backed entity behind them. Unlike a tournament page, these need
 * no fetch and no cache: the pair is fixed per path, so hooks.server.ts can
 * build tags from this table alone.
 */
const SITE_PAGE_META: Record<string, { title: string; description: string }> = {
	'/': {
		title: 'tourney.social — live draws for tennis & padel tournaments',
		description:
			'One link for the whole cup: live brackets, schedules and the courtside board, updating as every score lands.'
	},
	'/contact': {
		title: 'Contact — tourney.social',
		description:
			'Talk to the team behind tourney.social — tournaments, live draws and schedules for tennis and padel.'
	}
};

export function sitePageMeta(pathname: string): { title: string; description: string } | null {
	return SITE_PAGE_META[pathname] ?? null;
}

export interface MetaInput {
	name: string;
	sport?: string | null;
	location?: string | null;
	description?: string | null;
	section: string;
	/** Canonical absolute URL of the page (whitelisted params only). */
	url: string;
	/** Absolute URL of the OG image. */
	image: string;
}

function esc(s: string): string {
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/** The head fragment injected into the app shell for crawlers. */
export function buildMetaTags(input: MetaInput): string {
	const sectionLabel = SECTION_LABEL[input.section] ?? '';
	const title = sectionLabel ? `${input.name} — ${sectionLabel}` : input.name;
	const sport = input.sport ? input.sport.charAt(0).toUpperCase() + input.sport.slice(1) : null;
	const description =
		[sport, input.location, input.description].filter(Boolean).join(' · ') ||
		`Live draws, results and schedule on tourney.social`;

	const t = esc(title);
	const d = esc(description);
	const u = esc(input.url);
	const img = esc(input.image);
	return [
		`<title>${t}</title>`,
		`<meta name="description" content="${d}" />`,
		`<link rel="canonical" href="${u}" />`,
		`<meta property="og:type" content="website" />`,
		`<meta property="og:site_name" content="tourney.social" />`,
		`<meta property="og:title" content="${t}" />`,
		`<meta property="og:description" content="${d}" />`,
		`<meta property="og:url" content="${u}" />`,
		`<meta property="og:image" content="${img}" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
		`<meta name="twitter:title" content="${t}" />`,
		`<meta name="twitter:description" content="${d}" />`,
		`<meta name="twitter:image" content="${img}" />`
	].join('\n\t\t');
}
