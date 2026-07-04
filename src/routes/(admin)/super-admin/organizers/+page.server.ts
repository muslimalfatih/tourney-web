import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { listOrganizations, createOrganization } from '$lib/api/endpoints/admin';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listOrganizations({ fetch, token: locals.session.accessToken });
		return { organizations: data };
	} catch {
		return { organizations: [] };
	}
};

export const actions: Actions = {
	create: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const org_name = String(form.get('org_name') ?? '').trim();
		const organizer_name = String(form.get('organizer_name') ?? '').trim();
		const organizer_email = String(form.get('organizer_email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!org_name || !organizer_name || !organizer_email || password.length < 8) {
			return fail(400, { error: 'All fields are required; password must be 8+ characters.' });
		}
		try {
			await createOrganization(
				{ org_name, organizer_name, organizer_email, password },
				{ fetch, token: locals.session.accessToken }
			);
			return { created: true };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not create the organization.' }
			);
		}
	}
};
