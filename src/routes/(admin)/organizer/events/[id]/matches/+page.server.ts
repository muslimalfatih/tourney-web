import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getEvent } from '$lib/api/endpoints/events';
import { listEventMatches, submitScore, setMatchStatus } from '$lib/api/endpoints/matches';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [event, matches] = await Promise.all([
			getEvent(params.id, { fetch, token }),
			listEventMatches(params.id, { fetch, token })
		]);
		return { event, matches };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load matches');
	}
};

export const actions: Actions = {
	// Submit a score. The form sends set games as parallel arrays; we zip them
	// into SetScore objects. `complete` finalizes and advances the bracket.
	score: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const complete = form.get('complete') === 'true';

		const p1 = form.getAll('p1_games').map((v) => Number(v));
		const p2 = form.getAll('p2_games').map((v) => Number(v));
		const sets = p1
			.map((g, i) => ({ set_number: i + 1, p1_games: g, p2_games: p2[i] ?? 0 }))
			.filter((s) => Number.isFinite(s.p1_games) && Number.isFinite(s.p2_games));

		if (sets.length === 0) return fail(400, { error: 'Enter at least one set.' });

		try {
			await submitScore(matchId, { sets, complete }, { fetch, token: locals.session.accessToken });
			return { scored: true };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not save the score.' }
			);
		}
	},

	markLive: async ({ request, locals, fetch }) => {
		const matchId = String((await request.formData()).get('matchId') ?? '');
		try {
			await setMatchStatus(matchId, 'live', { fetch, token: locals.session.accessToken });
			return { live: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not update.' });
		}
	}
};
