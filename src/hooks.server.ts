import type { Handle } from '@sveltejs/kit';
import { getAccessToken, getRefreshToken, setSession, clearSession } from '$lib/server/session';
import { me, refresh } from '$lib/api/endpoints/auth';

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

	return resolve(event);
};
