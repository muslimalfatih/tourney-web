import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	getEvent,
	getEventBracket,
	getEventStandings,
	getGroupKnockout,
	resolveGroups
} from '$lib/api/endpoints/events';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const event = await getEvent(params.id, { fetch, token });
		if (event.format === 'round_robin') {
			const s = await getEventStandings(params.id, { fetch, token });
			return { event, bracket: null, standings: s.standings, groupKnockout: null };
		}
		if (event.format === 'group_knockout') {
			const gk = await getGroupKnockout(params.id, { fetch, token });
			return { event, bracket: null, standings: null, groupKnockout: gk };
		}
		const bracket = await getEventBracket(params.id, { fetch, token });
		return { event, bracket, standings: null, groupKnockout: null };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load the draw');
	}
};

export const actions: Actions = {
	resolve: async ({ params, locals, fetch }) => {
		try {
			const r = await resolveGroups(params.id, { fetch, token: locals.session.accessToken });
			return { filled: r.filled };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not resolve groups.' });
		}
	}
};
