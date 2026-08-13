import type { PageServerLoad } from './$types';
import { loadTournamentView } from '$lib/server/tournament-view';

// Tournament-wide surface — spans every division, so no division segment.
export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const { tournament } = await parent();
	return loadTournamentView({
		tournament,
		tournamentSlug: params.slug,
		fetch,
		view: 'players'
	});
};
