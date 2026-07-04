import type { PageServerLoad } from './$types';
import { getEventBracket } from '$lib/api/endpoints/events';

/**
 * SSR the bracket for the selected event (?event=<id>, defaulting to the first
 * event). Public read — no token. Returns the event id so the client can
 * re-fetch on live updates.
 */
export const load: PageServerLoad = async ({ url, fetch, parent }) => {
	const { tournament } = await parent();
	const eventId = url.searchParams.get('event') ?? tournament.events?.[0]?.id ?? null;
	if (!eventId) return { bracket: null, eventId: null };

	try {
		const bracket = await getEventBracket(eventId, { fetch });
		return { bracket, eventId };
	} catch {
		return { bracket: null, eventId };
	}
};
