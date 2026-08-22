import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getEvent } from '$lib/api/endpoints/events';
import { listEventMatches, submitScore, setMatchStatus, type Completion, type SetScore } from '$lib/api/endpoints/matches';
import { ApiError } from '$lib/api/client';
import { describeScoreError } from '$lib/utils/score-errors';

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
	// Submit a score. The form sends set games/tiebreaks as parallel arrays; we
	// zip them into SetScore objects. Completion drives the ending: normal
	// finalizes from the sets, walkover records no sets, retired keeps partial
	// sets — the latter two carry an explicit winner_slot. The server validates
	// everything; this action only shapes the payload and RENDERS its verdicts.
	score: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const completion = String(form.get('completion') ?? 'incomplete') as Completion;
		const winnerSlot = Number(form.get('winner_slot') ?? 0);

		const p1 = form.getAll('games_a').map((v) => Number(v));
		const p2 = form.getAll('games_b').map((v) => Number(v));
		const tba = form.getAll('tiebreak_a').map((v) => String(v));
		const tbb = form.getAll('tiebreak_b').map((v) => String(v));
		const sets: SetScore[] =
			completion === 'walkover'
				? []
				: p1
						.map((g, i) => {
							const set: SetScore = { set_number: i + 1, games_a: g, games_b: p2[i] ?? 0 };
							if (tba[i]) set.tiebreak_a = Number(tba[i]);
							if (tbb[i]) set.tiebreak_b = Number(tbb[i]);
							return set;
						})
						.filter((s) => Number.isFinite(s.games_a) && Number.isFinite(s.games_b));

		if (sets.length === 0 && completion !== 'walkover' && completion !== 'cancelled') {
			return fail(400, { error: 'Enter at least one set.' });
		}

		try {
			await submitScore(
				matchId,
				winnerSlot ? { sets, completion, winner_slot: winnerSlot } : { sets, completion },
				{ fetch, token: locals.session.accessToken }
			);
			return { scored: true };
		} catch (e) {
			if (e instanceof ApiError) return fail(e.status, { error: describeScoreError(e) });
			return fail(500, { error: 'Could not save the score.' });
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
