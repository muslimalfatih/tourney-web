import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getEvent, getEventBracket } from '$lib/api/endpoints/events';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [event, bracket] = await Promise.all([
			getEvent(params.id, { fetch, token }),
			getEventBracket(params.id, { fetch, token })
		]);
		return { event, bracket };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load the draw');
	}
};
