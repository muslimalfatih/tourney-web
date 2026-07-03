import type { PageServerLoad } from './$types';
import { listTournaments } from '$lib/api/endpoints/tournaments';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listTournaments({ fetch, token: locals.session.accessToken });
		return { tournaments: data };
	} catch {
		return { tournaments: [] };
	}
};
