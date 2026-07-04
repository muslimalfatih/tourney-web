import type { PageServerLoad } from './$types';
import { listPublicParticipants, type Participant } from '$lib/api/endpoints/participants';

/**
 * SSR the roster grouped by event. The tournament (with its events) comes from
 * the parent layout load; we fetch each event's public roster in parallel.
 */
export const load: PageServerLoad = async ({ fetch, parent }) => {
	const { tournament } = await parent();
	const events = tournament.events ?? [];

	const rosters = await Promise.all(
		events.map(async (e) => {
			try {
				const participants = await listPublicParticipants(e.id, { fetch });
				return { event: e, participants };
			} catch {
				return { event: e, participants: [] as Participant[] };
			}
		})
	);

	return { rosters };
};
