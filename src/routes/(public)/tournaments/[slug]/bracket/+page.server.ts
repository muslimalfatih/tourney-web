import type { PageServerLoad } from './$types';
import { getEventBracket, getEventStandings } from '$lib/api/endpoints/events';

/**
 * SSR the bracket (or standings, for round-robin) for the selected event
 * (?event=<id>, defaulting to the first event). Public read — no token.
 */
export const load: PageServerLoad = async ({ url, fetch, parent }) => {
	const { tournament } = await parent();
	const events = tournament.events ?? [];
	const eventId = url.searchParams.get('event') ?? events[0]?.id ?? null;
	if (!eventId) return { bracket: null, standings: null, eventId: null, isRoundRobin: false };

	const selected = events.find((e) => e.id === eventId);
	const isRoundRobin = selected?.format === 'round_robin';

	try {
		if (isRoundRobin) {
			const s = await getEventStandings(eventId, { fetch });
			return { bracket: null, standings: s.standings, eventId, isRoundRobin };
		}
		const bracket = await getEventBracket(eventId, { fetch });
		return { bracket, standings: null, eventId, isRoundRobin };
	} catch {
		return { bracket: null, standings: null, eventId, isRoundRobin };
	}
};
