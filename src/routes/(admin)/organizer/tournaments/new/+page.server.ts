import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createTournament } from '$lib/api/endpoints/tournaments';
import { ApiError } from '$lib/api/client';

export const actions: Actions = {
	default: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const slug = String(form.get('slug') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();

		if (!name || !slug) {
			return fail(400, { name, slug, location, error: 'Name and slug are required.' });
		}

		try {
			const created = await createTournament(
				{ name, slug, sport: 'tennis', location: location || undefined },
				{ fetch, token: locals.session.accessToken }
			);
			throw redirect(303, `/organizer/tournaments/${created.id}`);
		} catch (e) {
			if (e instanceof ApiError) {
				return fail(e.status, { name, slug, location, error: e.message });
			}
			throw e;
		}
	}
};
