import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getEvent,
	getOrgEventStandings,
	getOrgGroupKnockout,
	resolveGroups
} from '$lib/api/endpoints/events';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	let event;
	try {
		event = await getEvent(params.id, { fetch, token });
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load the draw');
	}

	// Single-elim brackets now live in the event page's Bracket tab (view +
	// edit). This standalone route only serves the read-only standings / group
	// views the tab doesn't render; send single-elim there. The redirect is
	// outside the try/catch so SvelteKit can propagate it.
	if (event.format === 'single_elim') {
		redirect(307, `/organizer/events/${params.id}?tab=bracket`);
	}

	try {
		if (event.format === 'round_robin') {
			const s = await getOrgEventStandings(params.id, { fetch, token });
			return { event, bracket: null, standings: s.standings, groupKnockout: null };
		}
		const gk = await getOrgGroupKnockout(params.id, { fetch, token });
		return { event, bracket: null, standings: null, groupKnockout: gk };
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
