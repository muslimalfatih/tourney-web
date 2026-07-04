import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	listTournaments,
	createTournament,
	publishTournament,
	unpublishTournament
} from '$lib/api/endpoints/tournaments';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listTournaments({ fetch, token: locals.session.accessToken });
		return { tournaments: data };
	} catch {
		return { tournaments: [] };
	}
};

export const actions: Actions = {
	// Create a tournament from the modal form, then reload the list.
	create: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const starts_on = String(form.get('starts_on') ?? '').trim();
		const ends_on = String(form.get('ends_on') ?? '').trim();

		if (!name) return fail(400, { error: 'A tournament name is required.' });

		try {
			await createTournament(
				{
					name,
					sport: 'tennis',
					location: location || undefined,
					starts_on: starts_on || undefined,
					ends_on: ends_on || undefined
				},
				{ fetch, token: locals.session.accessToken }
			);
			return { created: true };
		} catch (e) {
			const msg = e instanceof ApiError ? e.message : 'Could not create the tournament.';
			return fail(e instanceof ApiError ? e.status : 500, { error: msg });
		}
	},

	// Toggle publish state from the row menu.
	publish: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await publishTournament(id, { fetch, token: locals.session.accessToken });
			return { published: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Publish failed.' });
		}
	},

	unpublish: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('id') ?? '');
		try {
			await unpublishTournament(id, { fetch, token: locals.session.accessToken });
			return { unpublished: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Unpublish failed.' });
		}
	}
};
