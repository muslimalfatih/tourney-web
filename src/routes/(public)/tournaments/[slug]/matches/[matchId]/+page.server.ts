import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getMatch } from '$lib/api/endpoints/matches';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const match = await getMatch(params.matchId, { fetch });
		return { match };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Match not found');
		throw error(502, 'Failed to load match');
	}
};
