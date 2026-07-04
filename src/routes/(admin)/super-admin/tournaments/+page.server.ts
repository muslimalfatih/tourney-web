import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { listAllTournaments, setTournamentOversight } from '$lib/api/endpoints/admin';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listAllTournaments({ fetch, token: locals.session.accessToken });
		return { tournaments: data };
	} catch {
		return { tournaments: [] };
	}
};

export const actions: Actions = {
	oversight: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const action = String(form.get('action') ?? '') as 'suspend' | 'archive' | 'restore';
		try {
			await setTournamentOversight(id, action, { fetch, token: locals.session.accessToken });
			return { done: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Action failed.' });
		}
	}
};
