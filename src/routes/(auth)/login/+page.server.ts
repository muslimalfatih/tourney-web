import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { login } from '$lib/api/endpoints/auth';
import { setSession } from '$lib/server/session';
import { ApiError } from '$lib/api/client';

/** Already-authenticated users skip the login form. */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session.user) {
		throw redirect(303, dashboardFor(locals.session.user.role));
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Email and password are required.' });
		}

		try {
			const result = await login(email, password, { fetch });
			// Store tokens in httpOnly cookies — never exposed to browser JS.
			setSession(cookies, result.access_token, result.refresh_token);
			throw redirect(303, dashboardFor(result.user.role));
		} catch (e) {
			if (e instanceof ApiError) {
				return fail(401, { email, error: 'Invalid email or password.' });
			}
			throw e; // redirect() throws — let it propagate
		}
	}
};

function dashboardFor(role: string): string {
	return role === 'super_admin' ? '/super-admin' : '/organizer';
}
