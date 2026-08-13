import { error } from '@sveltejs/kit';
import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';
import { listPublicSchedule } from '$lib/api/endpoints/schedule';
import { listPublicParticipants, type Participant } from '$lib/api/endpoints/participants';
import type { EventDivision, PublicTournament } from '$lib/api/types';

/** Which surface the URL asked for. Divisions carry a phase; the other two are
 *  tournament-wide and ignore the division entirely. */
export type PublicView = 'groups' | 'bracket' | 'players' | 'schedule';

/**
 * Shared loader behind every public tournament route.
 *
 * Selection comes from the PATH now, not query params — /:tournament/:division
 * and /:tournament/:division/(groups|bracket) — so a shared link carries no
 * `?event=<uuid>&phase=&category=&gender=` tail. The old query shapes still
 * resolve, but they redirect here rather than rendering (see the legacy routes).
 *
 * `divisionSlug` accepts a UUID as well as a slug: links shared before the slug
 * migration keep working forever instead of 404ing.
 */
export async function loadTournamentView(opts: {
	tournament: PublicTournament;
	tournamentSlug: string;
	fetch: typeof globalThis.fetch;
	divisionSlug?: string;
	/** 'groups'/'bracket' pin the phase; omit to use whatever the division has. */
	view: PublicView | 'auto';
}) {
	const { tournament, tournamentSlug, fetch, divisionSlug } = opts;
	const events = tournament.events ?? [];

	// Accept slug OR id. The id branch is the compatibility path for links
	// created before migration 00005.
	const selected: EventDivision | null = divisionSlug
		? (events.find((e) => e.slug === divisionSlug) ?? events.find((e) => e.id === divisionSlug) ?? null)
		: (events[0] ?? null);

	// A named division that doesn't exist is a real 404 — not a silent fallback
	// to the first one, which would make a mistyped or deleted link quietly show
	// the wrong bracket and look like it worked.
	if (divisionSlug && !selected) error(404, 'Division not found');

	const eventId = selected?.id ?? null;
	const format = selected?.format ?? 'single_elim';

	// Snap the requested phase to one the division actually has. A round-robin
	// has no knockout, so /:division/bracket resolves to its group standings
	// rather than rendering an empty stage.
	const wantsKnockout = opts.view === 'bracket';
	const phase: 'group' | 'knockout' =
		opts.view === 'groups'
			? selected?.has_group_stage
				? 'group'
				: 'knockout'
			: wantsKnockout
				? selected?.has_knockout_stage
					? 'knockout'
					: 'group'
				: selected?.has_group_stage
					? 'group'
					: 'knockout';

	const view: PublicView =
		opts.view === 'players' || opts.view === 'schedule'
			? opts.view
			: phase === 'group'
				? 'groups'
				: 'bracket';

	const activeLabel = selected?.public_display_name || selected?.name || null;

	const schedulePromise = listPublicSchedule(tournamentSlug, { fetch }).catch(() => []);
	const rostersPromise = Promise.all(
		events.map(async (e) => {
			try {
				return { event: e, participants: await listPublicParticipants(e.id, { fetch }) };
			} catch {
				return { event: e, participants: [] as Participant[] };
			}
		})
	);

	const base = {
		eventId,
		eventSlug: selected?.slug ?? null,
		format,
		phase,
		view,
		activeLabel
	};
	const extras = async () => ({
		schedule: await schedulePromise,
		rosters: await rostersPromise
	});
	const empty = { bracket: null, standings: null, groupKnockout: null };

	if (!eventId) return { ...base, ...empty, ...(await extras()) };

	try {
		if (format === 'round_robin') {
			const s = await getEventStandings(eventId, { fetch });
			return { ...base, ...empty, standings: s.standings, ...(await extras()) };
		}
		if (format === 'group_knockout') {
			const gk = await getGroupKnockout(eventId, { fetch });
			return { ...base, ...empty, groupKnockout: gk, ...(await extras()) };
		}
		return { ...base, ...empty, bracket: await getEventBracket(eventId, { fetch }), ...(await extras()) };
	} catch {
		return { ...base, ...empty, ...(await extras()) };
	}
}

/** Canonical path builder — the single place URL shape is decided, so the
 *  filter strip, view switcher, redirects and og:url can't drift apart. */
export function divisionPath(
	tournamentSlug: string,
	divisionSlug: string | null,
	view?: PublicView
) {
	const base = `/tournaments/${tournamentSlug}`;
	if (view === 'players' || view === 'schedule') return `${base}/${view}`;
	if (!divisionSlug) return base;
	return view ? `${base}/${divisionSlug}/${view}` : `${base}/${divisionSlug}`;
}
