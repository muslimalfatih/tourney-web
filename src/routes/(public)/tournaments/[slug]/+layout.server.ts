import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPublicTournament } from '$lib/api/endpoints/tournaments';
import { ApiError } from '$lib/api/client';

/**
 * SSR the tournament shell (header + tabs). Public read, so no auth token is
 * needed. A 404 from the API becomes a SvelteKit 404.
 */
export const load: LayoutServerLoad = async ({ params, fetch }) => {
	try {
		const tournament = await getPublicTournament(params.slug, { fetch });
		return { tournament };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) {
			throw error(404, 'Tournament not found');
		}
		console.error('tournament load failed', e);
		throw error(502, 'Failed to load tournament');
	}
};
