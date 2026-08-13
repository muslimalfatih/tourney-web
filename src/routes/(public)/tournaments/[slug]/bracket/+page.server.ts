import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { divisionPath, type PublicView } from '$lib/server/tournament-view';

/**
 * LEGACY. Every link shared before the slug migration points here, carrying
 *   ?event=<uuid>&phase=group&category=&gender=  or  ?view=players|schedule
 * Translate to the canonical path and 301 — permanent, because the new URL for
 * a given division genuinely never changes (slugs are assigned once).
 *
 * `event` is matched by id OR slug, and category+gender remain supported as the
 * fallback selector they always were, so no previously-valid URL 404s.
 */
export const load: PageServerLoad = async ({ url, params, parent }) => {
	const { tournament } = await parent();
	const events = tournament.events ?? [];
	const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

	const qEvent = url.searchParams.get('event');
	const qCategory = url.searchParams.get('category');
	const qGender = url.searchParams.get('gender');
	const qView = url.searchParams.get('view');
	const qPhase = url.searchParams.get('phase');

	if (qView === 'players' || qView === 'schedule') {
		redirect(301, divisionPath(params.slug, null, qView));
	}

	const selected =
		(qEvent ? events.find((e) => e.id === qEvent || e.slug === qEvent) : undefined) ??
		(qCategory || qGender
			? events.find(
					(e) =>
						(!qCategory || norm(e.category) === norm(qCategory)) &&
						(!qGender || e.gender === qGender)
				)
			: undefined) ??
		events[0] ??
		null;

	// `view` and `phase` were written together with the same value; either may
	// be the one present on an old link.
	const wanted = qView ?? qPhase;
	const view: PublicView | undefined =
		wanted === 'group' ? 'groups' : wanted === 'knockout' ? 'bracket' : undefined;

	redirect(301, divisionPath(params.slug, selected?.slug ?? null, view));
};
