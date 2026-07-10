import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	getTournament,
	publishTournament,
	unpublishTournament
} from '$lib/api/endpoints/tournaments';
import { listEvents, createEvent, deleteEvent, updateEvent } from '$lib/api/endpoints/events';
import type { EventGender } from '$lib/api/types';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [tournament, events] = await Promise.all([
			getTournament(params.id, { fetch, token }),
			listEvents(params.id, { fetch, token })
		]);
		return { tournament, events };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Tournament not found');
		throw error(502, 'Failed to load tournament');
	}
};

export const actions: Actions = {
	addEvent: async ({ params, request, locals, fetch }) => {
		const token = locals.session.accessToken;
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const discipline = String(form.get('discipline') ?? 'singles');
		const format = String(form.get('format') ?? 'single_elim');
		const category = String(form.get('category') ?? '').trim();
		const gender = String(form.get('gender') ?? 'mixed');
		if (!name) return fail(400, { error: 'An event name is required.' });
		try {
			const created = await createEvent(
				params.id,
				{
					name,
					discipline: discipline as 'singles' | 'doubles',
					format: format as 'single_elim' | 'round_robin' | 'group_knockout'
				},
				{ fetch, token }
			);
			// Create takes only name/discipline/format; apply the public-facing
			// category/gender in a follow-up patch when they were supplied.
			if (category || gender !== 'mixed') {
				await updateEvent(created.id, { category, gender: gender as EventGender }, { fetch, token });
			}
			return { added: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not add the event.' });
		}
	},

	deleteEvent: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('eventId') ?? '');
		try {
			await deleteEvent(id, { fetch, token: locals.session.accessToken });
			return { deleted: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Delete failed.' });
		}
	},

	publish: async ({ params, locals, fetch }) => {
		try {
			await publishTournament(params.id, { fetch, token: locals.session.accessToken });
			return { published: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Publish failed.' });
		}
	},

	unpublish: async ({ params, locals, fetch }) => {
		try {
			await unpublishTournament(params.id, { fetch, token: locals.session.accessToken });
			return { unpublished: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Unpublish failed.' });
		}
	}
};
