import type { Handle } from '@sveltejs/kit';
import { getAccessToken } from '$lib/server/session';
import { me } from '$lib/api/endpoints/auth';

/**
 * On every request, resolve the session from the httpOnly cookie and attach it
 * to `event.locals`. Load functions read `locals.session` to gate admin routes
 * and to forward the access token to laga-api. We validate the token by calling
 * /me; a failure simply yields an unauthenticated session (public pages still
 * render).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const accessToken = getAccessToken(event.cookies);

	event.locals.session = { user: null, accessToken };

	if (accessToken) {
		try {
			const user = await me({ fetch: event.fetch, token: accessToken });
			event.locals.session.user = user;
		} catch {
			// Expired/invalid token → stay unauthenticated. A refresh flow can be
			// added here later using the refresh cookie.
			event.locals.session.accessToken = null;
		}
	}

	return resolve(event);
};
