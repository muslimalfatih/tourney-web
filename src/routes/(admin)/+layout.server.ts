import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Single auth gate for the entire admin area. Unauthenticated users are sent to
 * login. This is a UX gate; the API independently enforces authorization on
 * every request, so a forged session cannot access protected data.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	return { user: locals.session.user };
};
