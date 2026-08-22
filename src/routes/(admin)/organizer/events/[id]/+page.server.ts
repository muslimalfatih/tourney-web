import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	getEvent,
	getOrgEventBracket,
	getOrgGroupKnockout,
	updateGroupAdvance,
	buildBracket,
	addManualMatch,
	generateFixtures,
	deleteManualMatch,
	setGroups,
	updateEvent,
	type BuildMatchInput,
	type UpdateEventInput,
	type GroupKnockout
} from '$lib/api/endpoints/events';
import type { EventGender } from '$lib/api/types';
import { getTournament } from '$lib/api/endpoints/tournaments';
import {
	listParticipants,
	addParticipant,
	deleteParticipant,
	renameParticipant
} from '$lib/api/endpoints/participants';
import { listCourts, createSlot } from '$lib/api/endpoints/schedule';
import { submitScore, setMatchStatus, type SetScore, type Completion } from '$lib/api/endpoints/matches';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const event = await getEvent(params.id, { fetch, token });
		// Courts are per-tournament; the bracket read-model is empty until a draw
		// exists. The tournament gives us the slug (public URL preview on the
		// Public settings tab) + description.
		const [participants, bracket, courts, tournament] = await Promise.all([
			listParticipants(params.id, { fetch, token }),
			getOrgEventBracket(params.id, { fetch, token }),
			listCourts(event.tournament_id, { fetch, token }),
			getTournament(event.tournament_id, { fetch, token })
		]);
		// Group-knockout events also need per-group standings for the Overview
		// group panel. Other formats have no groups — skip the fetch.
		let groupKnockout: GroupKnockout | null = null;
		if (event.has_group_stage && event.format === 'group_knockout') {
			groupKnockout = await getOrgGroupKnockout(params.id, { fetch, token }).catch(() => null);
		}
		return { event, participants, bracket, courts, tournament, groupKnockout };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load event');
	}
};

export const actions: Actions = {
	// Public settings tab: patch the event's public-facing config. Only the keys
	// present in the form are sent, so omitted fields stay unchanged server-side.
	updatePublicSettings: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const patch: UpdateEventInput = {
			category: String(form.get('category') ?? ''),
			gender: String(form.get('gender') ?? 'mixed') as EventGender,
			is_public: form.get('is_public') === 'on',
			public_display_name: String(form.get('public_display_name') ?? '')
		};
		const orderRaw = String(form.get('public_order') ?? '').trim();
		if (orderRaw !== '') {
			const n = Number(orderRaw);
			if (!Number.isInteger(n) || n < 0) return fail(400, { error: 'Order must be a whole number ≥ 0.' });
			patch.public_order = n;
		}
		try {
			await updateEvent(params.id, patch, { fetch, token: locals.session.accessToken });
			return { publicSettingsSaved: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not save settings.' });
		}
	},

	// Overview group panel: edit how many teams advance from a group.
	setGroupAdvance: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const groupId = String(form.get('groupId') ?? '');
		const advance = Number(String(form.get('advance_count') ?? ''));
		if (!groupId) return fail(400, { error: 'Missing group.' });
		if (!Number.isInteger(advance) || advance < 1)
			return fail(400, { error: 'Advance count must be a whole number ≥ 1.' });
		try {
			await updateGroupAdvance(params.id, groupId, advance, {
				fetch,
				token: locals.session.accessToken
			});
			return { groupAdvanceSaved: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not update.' });
		}
	},

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

	// build runs the single-elim Match builder from explicit round-1 pairings
	// (manual only), overwriting any existing draw. The `matches` payload is a
	// JSON array of { team_a_id, team_b_id } (either may be null for a bye).
	build: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		let matches: BuildMatchInput[];
		try {
			matches = JSON.parse(String(form.get('matches') ?? '[]')) as BuildMatchInput[];
		} catch {
			return fail(400, { error: 'Could not read the pairings.' });
		}
		try {
			const res = await buildBracket(params.id, matches, {
				fetch,
				token: locals.session.accessToken
			});
			return { built: true, matches: res.matches };
		} catch (e) {
			return fail(e instanceof ApiError ? e.status : 500, {
				error: e instanceof ApiError ? e.message : 'Could not build the bracket.'
			});
		}
	},

	// Round-robin: add / remove a single fixture (manual setup). A 409
	// duplicate_fixture comes back structured so the builder can show the
	// existing match and — for a decided prior fixture — offer the explicit
	// rematch confirmation (only that path resubmits allow_rematch=true).
	addManualMatch: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const a = String(form.get('team_a_id') ?? '');
		const b = String(form.get('team_b_id') ?? '');
		if (!a || !b) return fail(400, { error: 'Pick both teams.' });
		if (a === b) return fail(400, { error: 'A match needs two different teams.' });
		try {
			await addManualMatch(params.id, a, b, {
				fetch,
				token: locals.session.accessToken,
				allowRematch: form.get('allow_rematch') === 'true'
			});
			return { fixtureAdded: true };
		} catch (e) {
			if (e instanceof ApiError && e.code === 'duplicate_fixture') {
				const d = (e.details ?? {}) as {
					match_no?: number;
					status?: string;
					rematchable?: boolean;
				};
				return fail(409, {
					error: e.message,
					duplicate: {
						match_no: d.match_no ?? 0,
						status: d.status ?? '',
						rematchable: d.rematchable ?? false,
						team_a_id: a,
						team_b_id: b
					}
				});
			}
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not add the fixture.' });
		}
	},

	// Round-robin: idempotently create every missing pairing.
	generateFixtures: async ({ params, locals, fetch }) => {
		try {
			const res = await generateFixtures(params.id, { fetch, token: locals.session.accessToken });
			return { generated: res };
		} catch (e) {
			return fail(500, {
				error: e instanceof ApiError ? e.message : 'Could not generate fixtures.'
			});
		}
	},

	deleteManualMatch: async ({ request, locals, fetch }) => {
		const matchId = String((await request.formData()).get('matchId') ?? '');
		try {
			await deleteManualMatch(matchId, { fetch, token: locals.session.accessToken });
			return { fixtureRemoved: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not remove the fixture.' });
		}
	},

	// Group-knockout: assign teams to groups + build fixtures.
	setGroups: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		let groups: { name: string; advance_count: number; team_ids: string[] }[];
		try {
			groups = JSON.parse(String(form.get('groups') ?? '[]'));
		} catch {
			return fail(400, { error: 'Could not read the groups.' });
		}
		try {
			const res = await setGroups(params.id, groups, {
				fetch,
				token: locals.session.accessToken
			});
			return { groupsBuilt: true, matches: res.matches };
		} catch (e) {
			return fail(e instanceof ApiError ? e.status : 500, {
				error: e instanceof ApiError ? e.message : 'Could not build the group draw.'
			});
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
	// winner. Set games arrive as parallel games_a / games_b arrays.
	score: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const a = form.getAll('games_a').map((v) => Number(v));
		const b = form.getAll('games_b').map((v) => Number(v));
		const tba = form.getAll('tiebreak_a').map((v) => String(v));
		const tbb = form.getAll('tiebreak_b').map((v) => String(v));
		const completion = String(form.get('completion') ?? 'incomplete') as Completion;
		const winnerSlot = Number(form.get('winner_slot') ?? 0);
		// Walkovers record no sets; otherwise pair up the parallel arrays and
		// attach tiebreak metadata only where the organizer entered it.
		const sets: SetScore[] =
			completion === 'walkover'
				? []
				: a
						.map((g, i) => {
							const set: SetScore = { set_number: i + 1, games_a: g, games_b: b[i] ?? 0 };
							if (tba[i]) set.tiebreak_a = Number(tba[i]);
							if (tbb[i]) set.tiebreak_b = Number(tbb[i]);
							return set;
						})
						.filter((s) => Number.isFinite(s.games_a) && Number.isFinite(s.games_b));
		try {
			await submitScore(
				matchId,
				winnerSlot ? { sets, completion, winner_slot: winnerSlot } : { sets, completion },
				{ fetch, token: locals.session.accessToken }
			);
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
