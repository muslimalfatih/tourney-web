import type { EventDivision } from '$lib/api/types';
import {
	getEventBracket,
	getEventStandings,
	getGroupKnockout,
	type EventBracket,
	type Standing,
	type GroupKnockout
} from '$lib/api/endpoints/events';
import { listPublicSchedule, type ScheduleSlot } from '$lib/api/endpoints/schedule';

// Presentation mode (Phase 4C) reads ONLY the existing public endpoints — the
// API already scopes them to published tournaments and public divisions, so
// visibility rules hold with no new backend. ssr=false on the public group
// means this load runs in the browser, same as every other public surface.

export interface DivisionDeck {
	event: EventDivision;
	bracket: EventBracket | null;
	standings: Standing[] | null;
	gk: GroupKnockout | null;
}

export interface DeckData {
	divisions: DivisionDeck[];
	schedule: ScheduleSlot[];
}

/** Fetch everything the deck renders. Reused by the SSE refetch path. */
export async function loadDeck(
	slug: string,
	events: EventDivision[],
	fetchFn: typeof fetch
): Promise<DeckData> {
	const [schedule, divisions] = await Promise.all([
		listPublicSchedule(slug, { fetch: fetchFn }).catch(() => [] as ScheduleSlot[]),
		Promise.all(
			events.map(async (event): Promise<DivisionDeck> => {
				const d: DivisionDeck = { event, bracket: null, standings: null, gk: null };
				try {
					if (event.format === 'round_robin') {
						const [b, s] = await Promise.all([
							getEventBracket(event.id, { fetch: fetchFn }).catch(() => null),
							getEventStandings(event.id, { fetch: fetchFn }).catch(() => null)
						]);
						d.bracket = b;
						d.standings = s?.standings ?? null;
					} else if (event.format === 'group_knockout') {
						d.gk = await getGroupKnockout(event.id, { fetch: fetchFn }).catch(() => null);
					} else {
						d.bracket = await getEventBracket(event.id, { fetch: fetchFn }).catch(() => null);
					}
				} catch {
					// A division that fails to load simply contributes no slides.
				}
				return d;
			})
		)
	]);
	return { divisions, schedule };
}
