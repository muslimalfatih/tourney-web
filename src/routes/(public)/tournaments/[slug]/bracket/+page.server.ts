import type { PageServerLoad } from './$types';
import { getPublicBracket } from '$lib/api/endpoints/tournaments';

/**
 * SSR the bracket for the selected event (?event=<id>). If no event is selected
 * or the fetch fails, return null and let the page fall back to sample data.
 */
export const load: PageServerLoad = async ({ url, fetch, parent }) => {
	const { tournament } = await parent();
	const eventId = url.searchParams.get('event') ?? tournament.events?.[0]?.id;

	if (!eventId) return { bracket: null };

	try {
		const bracket = await getPublicBracket(eventId, { fetch });
		return { bracket };
	} catch {
		return { bracket: null };
	}
};
