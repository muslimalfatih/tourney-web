import type { PageServerLoad } from './$types';
import { loadTournamentView } from '$lib/server/tournament-view';

// /tournaments/:tournament/:division — the shortest shareable link. `auto`
// resolves to whichever phase the division actually has, so this URL can never
// land on an empty stage.
export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const { tournament } = await parent();
	return loadTournamentView({
		tournament,
		tournamentSlug: params.slug,
		fetch,
		divisionSlug: params.division,
		view: 'auto'
	});
};
