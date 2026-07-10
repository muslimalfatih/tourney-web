import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	getEvent,
	getEventBracket,
	buildBracket,
	generateDraw,
	type BuildMatchInput,
	type PairingMode
} from '$lib/api/endpoints/events';
import {
	listParticipants,
	addParticipant,
	deleteParticipant,
	renameParticipant
} from '$lib/api/endpoints/participants';
import { listCourts, createSlot } from '$lib/api/endpoints/schedule';
import { submitScore, setMatchStatus, type SetScore } from '$lib/api/endpoints/matches';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const event = await getEvent(params.id, { fetch, token });
		// Courts are per-tournament; the bracket read-model is empty until a draw
		// exists. Both are needed by the Bracket tab (scheduling + rendering).
		const [participants, bracket, courts] = await Promise.all([
			listParticipants(params.id, { fetch, token }),
			getEventBracket(params.id, { fetch, token }),
			listCourts(event.tournament_id, { fetch, token })
		]);
		return { event, participants, bracket, courts };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load event');
	}
};

export const actions: Actions = {
	addParticipant: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const display_name = String(form.get('display_name') ?? '').trim();
		if (!display_name) return fail(400, { error: 'A name is required.' });
		try {
			await addParticipant(params.id, { display_name }, { fetch, token: locals.session.accessToken });
			return { added: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not add.' });
		}
	},

	renameParticipant: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const id = String(form.get('participantId') ?? '');
		const display_name = String(form.get('display_name') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing participant.' });
		if (!display_name) return fail(400, { error: 'A name is required.' });
		try {
			await renameParticipant(id, display_name, { fetch, token: locals.session.accessToken });
			return { renamed: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not rename.' });
		}
	},

	deleteParticipant: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('participantId') ?? '');
		try {
			await deleteParticipant(id, { fetch, token: locals.session.accessToken });
			return { deleted: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Delete failed.' });
		}
	},

	// build runs the Match builder: auto (random pairs) or manual (explicit R1
	// pairings), overwriting any existing draw. The manual `matches` payload is a
	// JSON array of { team_a_id, team_b_id } (either may be null for a bye).
	build: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const mode = String(form.get('pairing_mode') ?? 'auto') as PairingMode;
		let matches: BuildMatchInput[] | undefined;
		if (mode === 'manual') {
			try {
				matches = JSON.parse(String(form.get('matches') ?? '[]')) as BuildMatchInput[];
			} catch {
				return fail(400, { error: 'Could not read the pairings.' });
			}
		}
		try {
			const res = await buildBracket(
				params.id,
				{ pairing_mode: mode, matches },
				{ fetch, token: locals.session.accessToken }
			);
			return { built: true, matches: res.matches };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not build the bracket.' }
			);
		}
	},

	// generate is the non-single-elim draw path (round robin, group knockout).
	// The Match builder / build endpoint is single-elim only; these formats use
	// the format-agnostic generator, which clears and rebuilds the draw.
	generate: async ({ params, locals, fetch }) => {
		try {
			await generateDraw(params.id, { fetch, token: locals.session.accessToken });
			return { generated: true };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not generate the draw.' }
			);
		}
	},

	// schedule stamps a match's court + start time by creating a schedule slot
	// (the backend updates matches.court_id / scheduled_at as a side effect). A
	// 1-hour default end keeps the slot valid; duration isn't surfaced in M1.
	schedule: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const tournament_id = String(form.get('tournament_id') ?? '');
		const match_id = String(form.get('match_id') ?? '');
		const court_id = String(form.get('court_id') ?? '');
		const starts_at = String(form.get('starts_at') ?? '');
		if (!court_id || !starts_at) return fail(400, { error: 'Pick a court and a start time.' });
		const start = new Date(starts_at);
		if (Number.isNaN(start.getTime())) return fail(400, { error: 'Invalid start time.' });
		const ends_at = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
		try {
			await createSlot(
				{ tournament_id, court_id, match_id, starts_at: start.toISOString(), ends_at },
				{ fetch, token: locals.session.accessToken }
			);
			return { scheduled: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not schedule.' });
		}
	},

	// score saves set games for a match; complete=true finalizes and advances the
	// winner. Set games arrive as parallel p1_games / p2_games arrays.
	score: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const p1 = form.getAll('p1_games').map((v) => Number(v));
		const p2 = form.getAll('p2_games').map((v) => Number(v));
		const complete = form.get('complete') === 'true';
		const sets: SetScore[] = p1
			.map((g, i) => ({ set_number: i + 1, p1_games: g, p2_games: p2[i] ?? 0 }))
			.filter((s) => Number.isFinite(s.p1_games) && Number.isFinite(s.p2_games));
		try {
			await submitScore(matchId, { sets, complete }, { fetch, token: locals.session.accessToken });
			return { scored: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not save the score.' });
		}
	},

	markLive: async ({ request, locals, fetch }) => {
		const matchId = String((await request.formData()).get('matchId') ?? '');
		try {
			await setMatchStatus(matchId, 'live', { fetch, token: locals.session.accessToken });
			return { live: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not start the match.' });
		}
	}
};
