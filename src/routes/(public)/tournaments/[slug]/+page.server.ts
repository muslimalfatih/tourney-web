import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { divisionPath } from '$lib/server/tournament-view';

// Bare tournament URL lands on its first division, which is the canonical page.
// 307 (not 301): which division is "first" is data that can change, so this
// must not be cached permanently by browsers.
export const load: PageServerLoad = async ({ params, parent }) => {
	const { tournament } = await parent();
	const first = tournament.events?.[0] ?? null;
	redirect(307, divisionPath(params.slug, first?.slug ?? null));
};
