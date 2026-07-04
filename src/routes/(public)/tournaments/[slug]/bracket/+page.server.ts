import type { PageServerLoad } from './$types';
import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';

/**
 * SSR the appropriate view for the selected event by format:
 * single_elim → bracket, round_robin → standings, group_knockout → groups+KO.
 */
export const load: PageServerLoad = async ({ url, fetch, parent }) => {
	const { tournament } = await parent();
	const events = tournament.events ?? [];
	const eventId = url.searchParams.get('event') ?? events[0]?.id ?? null;
	const selected = events.find((e) => e.id === eventId);
	const format = selected?.format ?? 'single_elim';

	const base = { eventId, format };
	if (!eventId) return { ...base, bracket: null, standings: null, groupKnockout: null };

	try {
		if (format === 'round_robin') {
			const s = await getEventStandings(eventId, { fetch });
			return { ...base, bracket: null, standings: s.standings, groupKnockout: null };
		}
		if (format === 'group_knockout') {
			const gk = await getGroupKnockout(eventId, { fetch });
			return { ...base, bracket: null, standings: null, groupKnockout: gk };
		}
		const bracket = await getEventBracket(eventId, { fetch });
		return { ...base, bracket, standings: null, groupKnockout: null };
	} catch {
		return { ...base, bracket: null, standings: null, groupKnockout: null };
	}
};
