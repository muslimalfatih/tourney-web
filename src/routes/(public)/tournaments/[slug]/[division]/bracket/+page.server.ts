import type { PageServerLoad } from './$types';
import { loadTournamentView } from '$lib/server/tournament-view';

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const { tournament } = await parent();
	return loadTournamentView({
		tournament,
		tournamentSlug: params.slug,
		fetch,
		divisionSlug: params.division,
		view: 'bracket'
	});
};
