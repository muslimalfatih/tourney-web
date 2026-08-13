import type { EventDivision, EventGender } from '$lib/api/types';

export type FilterChange = { category?: string | null; gender?: EventGender | null };

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Pick the division to navigate to when one filter dimension is changed.
 *
 * The filter strip is a two-dimensional selector (category x gender) over a
 * SPARSE matrix — a tournament rarely runs every category in every gender. In
 * bali-open-2026, Intermediate exists only as mixed and Beginner only as men.
 *
 * So the dimension the user just clicked is AUTHORITATIVE and the other one is
 * only a preference. Requiring both to match lands on an empty cell, and
 * falling back to the current division makes the click look broken: the button
 * highlights, nothing moves, because the destination equals where you already
 * are. Relaxing the untouched dimension is what makes every enabled control do
 * something.
 */
export function resolveDivision(
	events: EventDivision[],
	current: EventDivision | null,
	change: FilterChange
): EventDivision | null {
	const changedCategory = 'category' in change;
	const wantCategory = changedCategory ? change.category : (current?.category ?? null);
	const wantGender = 'gender' in change ? change.gender : (current?.gender ?? null);

	const matches = (e: EventDivision, category: string | null, gender: EventGender | null) =>
		(!category || norm(e.category) === norm(category)) && (!gender || e.gender === gender);

	// 1. Both dimensions — keeps you in the same gender when that combination
	//    actually exists, which is the nicest outcome when it's available.
	const exact = events.find((e) => matches(e, wantCategory ?? null, wantGender ?? null));
	if (exact) return exact;

	// 2. Relax the dimension the user did NOT touch. `events` arrives in
	//    public_order, so this picks the organizer's own first choice.
	const relaxed = changedCategory
		? events.find((e) => matches(e, wantCategory ?? null, null))
		: events.find((e) => matches(e, null, wantGender ?? null));
	if (relaxed) return relaxed;

	// 3. Nothing matches at all — stay put rather than navigating nowhere.
	return current;
}
