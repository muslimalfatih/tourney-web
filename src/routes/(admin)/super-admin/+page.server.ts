import type { PageServerLoad } from './$types';
import { listOrganizations, listAllTournaments } from '$lib/api/endpoints/admin';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [orgs, tournaments] = await Promise.all([
			listOrganizations({ fetch, token }),
			listAllTournaments({ fetch, token })
		]);
		return {
			stats: {
				organizations: orgs.meta.total,
				tournaments: tournaments.meta.total,
				published: tournaments.data.filter((t) => t.status === 'published').length
			}
		};
	} catch {
		return { stats: { organizations: 0, tournaments: 0, published: 0 } };
	}
};
