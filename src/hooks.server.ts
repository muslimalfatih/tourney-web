import type { Handle } from '@sveltejs/kit';
import { getAccessToken, getRefreshToken, setSession, clearSession } from '$lib/server/session';
import { me, refresh } from '$lib/api/endpoints/auth';
import { getPublicTournament } from '$lib/api/endpoints/tournaments';
import { buildMetaTags, tournamentPathInfo } from '$lib/server/meta';
import { shareUrl } from '$lib/utils/share';
import { SITE_BASE_URL } from '$lib/config/env';

// Link-preview metadata (Phase 4B, "Option A"): the public pages are
// client-rendered, so the served shell carries no tags a crawler can read.
// For public tournament paths we ask the Go API for the tournament — the API
// is the visibility authority, so drafts/hidden tournaments 404 and inject
// NOTHING — and swap the tags in over the shell's <!-- laga:head --> marker.
// A tiny per-slug TTL cache keeps crawler bursts off the API.
const metaCache = new Map<string, { tags: string | null; until: number }>();
const META_TTL_MS = 60_000;

async function publicMetaTags(url: URL, fetchFn: typeof fetch): Promise<string | null> {
	const info = tournamentPathInfo(url.pathname);
	if (!info) return null;

	const cacheKey = `${info.slug}|${info.section}|${url.search}`;
	const hit = metaCache.get(cacheKey);
	if (hit && hit.until > Date.now()) return hit.tags;

	let tags: string | null = null;
	try {
		const t = await getPublicTournament(info.slug, { fetch: fetchFn });
		const origin = (SITE_BASE_URL || url.origin).replace(/\/$/, '');
		tags = buildMetaTags({
			name: t.name,
			sport: t.sport,
			location: t.location,
			description: t.description,
			section: info.section,
			url: shareUrl(url, origin),
			image: `${origin}/og-default.png`
		});
	} catch {
		// Not published / API unreachable — the shell ships without tags.
	}
	metaCache.set(cacheKey, { tags, until: Date.now() + META_TTL_MS });
	return tags;
}

/**
 * On every request, resolve the session from the httpOnly cookie and attach it
 * to `event.locals`. Load functions read `locals.session` to gate admin routes
 * and to forward the access token to laga-api.
 *
 * The access token is short-lived (15 min). When it expires, we transparently
 * exchange the long-lived refresh cookie for a fresh pair and rotate the
 * cookies, so the organizer stays signed in. Only a missing/invalid refresh
 * token yields an unauthenticated session.
 */
export const handle: Handle = async ({ event, resolve }) => {
	let accessToken = getAccessToken(event.cookies);
	event.locals.session = { user: null, accessToken };

	if (accessToken) {
		try {
			event.locals.session.user = await me({ fetch: event.fetch, token: accessToken });
		} catch {
			// Access token expired/invalid — try the refresh token before giving up.
			accessToken = null;
		}
	}

	// No valid access token but a refresh token exists → rotate and retry.
	if (!event.locals.session.user) {
		const rt = getRefreshToken(event.cookies);
		if (rt) {
			try {
				const tokens = await refresh(rt, { fetch: event.fetch });
				setSession(event.cookies, tokens.access_token, tokens.refresh_token);
				event.locals.session.accessToken = tokens.access_token;
				event.locals.session.user = await me({ fetch: event.fetch, token: tokens.access_token });
			} catch {
				// Refresh token dead too → fully unauthenticated; clear stale cookies.
				clearSession(event.cookies);
				event.locals.session.accessToken = null;
			}
		} else {
			event.locals.session.accessToken = null;
		}
	}

	// Public tournament pages: inject crawler metadata into the app shell.
	// Only the HTML shell request matters; data/asset requests skip the fetch.
	if (event.request.method === 'GET' && tournamentPathInfo(event.url.pathname)) {
		const tags = await publicMetaTags(event.url, event.fetch);
		if (tags) {
			return resolve(event, {
				transformPageChunk: ({ html }) => html.replace('<!-- laga:head -->', tags)
			});
		}
	}

	return resolve(event);
};
