import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getTournament } from '$lib/api/endpoints/tournaments';
import { listEvents } from '$lib/api/endpoints/events';
import { listEventMatches } from '$lib/api/endpoints/matches';
import {
	listCourts,
	listSchedule,
	createCourt,
	createSlot,
	deleteSlot
} from '$lib/api/endpoints/schedule';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [tournament, events, courts, schedule] = await Promise.all([
			getTournament(params.id, { fetch, token }),
			listEvents(params.id, { fetch, token }),
			listCourts(params.id, { fetch, token }),
			listSchedule(params.id, { fetch, token })
		]);

		// Gather matches across all events that have real participants (playable),
		// so the organizer can assign them to slots.
		const matchLists = await Promise.all(
			events.map((e) => listEventMatches(e.id, { fetch, token }).catch(() => []))
		);
		const scheduledIds = new Set(schedule.map((s) => s.match_id).filter(Boolean));
		const matches = matchLists.flat().map((m) => ({
			id: m.id,
			label:
				(m.participants ?? [])
					.slice()
					.sort((a, b) => a.slot - b.slot)
					.map((p) => p.display_name ?? 'TBD')
					.join(' vs ') || `Match ${m.match_no}`,
			scheduled: scheduledIds.has(m.id),
			playable: (m.participants ?? []).every((p) => p.participant_id)
		}));

		return { tournament, courts, schedule, matches };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Tournament not found');
		throw error(502, 'Failed to load schedule');
	}
};

export const actions: Actions = {
	addCourt: async ({ params, request, locals, fetch }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'A court name is required.' });
		try {
			await createCourt(params.id, { name }, { fetch, token: locals.session.accessToken });
			return { courtAdded: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not add the court.' });
		}
	},

	addSlot: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const court_id = String(form.get('court_id') ?? '');
		const match_id = String(form.get('match_id') ?? '') || null;
		// starts_at is an ISO string from the DateTimePicker (local time already
		// normalized to UTC by the browser). A slot runs 90 minutes by default.
		const startsRaw = String(form.get('starts_at') ?? '');
		if (!court_id || !startsRaw) {
			return fail(400, { error: 'Court and start time are required.' });
		}
		const startDate = new Date(startsRaw);
		if (Number.isNaN(startDate.getTime())) {
			return fail(400, { error: 'Invalid start time.' });
		}
		const starts = startDate.toISOString();
		const end = new Date(startDate.getTime() + 90 * 60_000).toISOString();
		try {
			await createSlot(
				{ tournament_id: params.id, court_id, match_id, starts_at: starts, ends_at: end },
				{ fetch, token: locals.session.accessToken }
			);
			return { slotAdded: true };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not schedule.' }
			);
		}
	},

	deleteSlot: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('slotId') ?? '');
		try {
			await deleteSlot(id, { fetch, token: locals.session.accessToken });
			return { slotDeleted: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not remove the slot.' });
		}
	}
};
