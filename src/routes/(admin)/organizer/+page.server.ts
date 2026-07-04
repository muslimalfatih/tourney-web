import type { PageServerLoad } from './$types';
import { listTournaments } from '$lib/api/endpoints/tournaments';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listTournaments({ fetch, token: locals.session.accessToken });
		const tournaments = data;
		return {
			stats: {
				tournaments: tournaments.length,
				published: tournaments.filter((t) => t.status === 'published').length,
				events: tournaments.reduce((n, t) => n + (t.event_count ?? 0), 0)
			},
			recent: tournaments.slice(0, 5)
		};
	} catch {
		return { stats: { tournaments: 0, published: 0, events: 0 }, recent: [] };
	}
};
