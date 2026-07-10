import type { PageServerLoad } from './$types';
import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';
import { listPublicSchedule } from '$lib/api/endpoints/schedule';
import { listPublicParticipants, type Participant } from '$lib/api/endpoints/participants';
import type { EventGender } from '$lib/api/types';

/**
 * SSR the public view for the selected event. Selection is driven by URL query
 * params so the organizer's "Preview public page" deep-link (and the filter
 * strip) land on the right division:
 *   ?event=<id>        explicit event (wins if present)
 *   ?category=&gender= resolve the first public event matching both
 *   ?phase=group|knockout  which phase to show for group_knockout events
 * Falls back to the first public event. Read models are computed server-side
 * from the same match records the dashboard writes to (Part 2.6).
 */
export const load: PageServerLoad = async ({ url, params, fetch, parent }) => {
	const { tournament } = await parent();
	const events = tournament.events ?? [];

	const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
	const qEvent = url.searchParams.get('event');
	const qCategory = url.searchParams.get('category');
	const qGender = url.searchParams.get('gender') as EventGender | null;

	// Resolve the active event: explicit id → category+gender match → first.
	const selected =
		(qEvent ? events.find((e) => e.id === qEvent) : undefined) ??
		(qCategory || qGender
			? events.find(
					(e) =>
						(!qCategory || norm(e.category) === norm(qCategory)) &&
						(!qGender || e.gender === qGender)
				)
			: undefined) ??
		events[0] ??
		null;

	const eventId = selected?.id ?? null;
	const format = selected?.format ?? 'single_elim';

	// Phase: explicit ?phase=, else default by what the event has.
	const qPhase = url.searchParams.get('phase');
	const phase: 'group' | 'knockout' =
		qPhase === 'group' || qPhase === 'knockout'
			? qPhase
			: selected?.has_group_stage
				? 'group'
				: 'knockout';

	const activeLabel = selected?.public_display_name || selected?.name || null;

	// This is the single public page, so it also carries schedule + participant
	// rosters (folded into the view switcher). Fetch everything in parallel.
	const schedulePromise = listPublicSchedule(params.slug, { fetch }).catch(() => []);
	const rostersPromise = Promise.all(
		events.map(async (e) => {
			try {
				return { event: e, participants: await listPublicParticipants(e.id, { fetch }) };
			} catch {
				return { event: e, participants: [] as Participant[] };
			}
		})
	);

	const base = { eventId, format, phase, activeLabel };
	const extras = async () => ({
		schedule: await schedulePromise,
		rosters: await rostersPromise
	});

	if (!eventId) {
		return { ...base, bracket: null, standings: null, groupKnockout: null, ...(await extras()) };
	}

	try {
		if (format === 'round_robin') {
			const s = await getEventStandings(eventId, { fetch });
			return { ...base, bracket: null, standings: s.standings, groupKnockout: null, ...(await extras()) };
		}
		if (format === 'group_knockout') {
			const gk = await getGroupKnockout(eventId, { fetch });
			return { ...base, bracket: null, standings: null, groupKnockout: gk, ...(await extras()) };
		}
		const bracket = await getEventBracket(eventId, { fetch });
		return { ...base, bracket, standings: null, groupKnockout: null, ...(await extras()) };
	} catch {
		return { ...base, bracket: null, standings: null, groupKnockout: null, ...(await extras()) };
	}
};
