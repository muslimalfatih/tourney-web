// Slot-based layout for a paged knockout bracket. No DOM measurement: every
// number is derived from round sizes and a handful of constants, so it can be
// computed synchronously and animated (container height, slot positions)
// purely from data.
//
// The core idea: the leftmost *visible* column is always laid out compactly
// (one slot per match, tightly stacked) — regardless of which round that
// happens to be once paging has moved the window. Every column after it
// inherits its slot geometry from its two feeders in the previous visible
// column: a slot's top = its first feeder's top, its height = the span from
// the first feeder's top to the second feeder's bottom. Centering a match
// card inside that slot then places it exactly at the midpoint between the
// two matches feeding it, with no special-casing per round.

import type {
	BracketLayout,
	FullBracketLayout,
	FullRoundLayout,
	Match,
	MatchSlot,
	Round,
	VisibleRoundLayout
} from '$lib/types/bracket';

export const CARD_W = 240;
export const CARD_H = 76;
export const GAP_X = 64; // horizontal space between columns, reserved for connectors
export const BASE_GAP_Y = 20; // vertical gap between stacked cards in the compact column
export const VISIBLE_COLS = 3;

export type LayoutConstants = {
	cardW: number;
	cardH: number;
	gapX: number;
	baseGapY: number;
	visibleCols: number;
};

export const DEFAULT_LAYOUT_CONSTANTS: LayoutConstants = {
	cardW: CARD_W,
	cardH: CARD_H,
	gapX: GAP_X,
	baseGapY: BASE_GAP_Y,
	visibleCols: VISIBLE_COLS
};

// Responsive presets. Card width/gutter/vertical rhythm all shrink together as
// the viewport narrows, and the visible column count itself drops — 3 columns
// of even a compact card cannot fit a phone width, so mobile shows one round
// at a time (see PagedKnockoutBracket's connector-skipping when visibleCols
// is 1: there's no adjacent column to draw a feeder line into).
export const DESKTOP_LAYOUT_CONSTANTS: LayoutConstants = DEFAULT_LAYOUT_CONSTANTS;

export const TABLET_LAYOUT_CONSTANTS: LayoutConstants = {
	cardW: 200,
	cardH: 72,
	gapX: 40,
	baseGapY: 16,
	visibleCols: 2
};

const MOBILE_MIN_CARD_W = 220; // below this, team names/scores stop being legible
const MOBILE_MAX_CARD_W = 300; // above this it just looks stretched on a phablet-width phone
// Chrome around the single card at the mobile tier: two 30px nav buttons plus
// the two 6px gaps between them/the card (mirrors the mobile .nav/.bracket CSS
// below) — subtracted from the viewport so the card can never overflow it,
// verified against a 320px (iPhone SE class) viewport as the tightest real case.
const MOBILE_NAV_CHROME = 30 * 2 + 6 * 2;

export const MOBILE_LAYOUT_CONSTANTS: LayoutConstants = {
	cardW: MOBILE_MAX_CARD_W, // fallback when width is unknown; constantsForWidth always recomputes this
	cardH: 68,
	gapX: 0, // no gutter — there is no next visible column to connect to
	baseGapY: 14,
	visibleCols: 1
};

// Horizontal-scroll mode (tablet + mobile): every round renders at once in a
// natively-scrollable row, so — unlike the paged mobile/tablet presets above,
// which compress a card to fit next to paging nav buttons — there is no need
// to fit anything to the viewport. Overflow is expected and is the whole
// point; the card just needs to stay comfortably readable. One shared preset
// for both tiers keeps every round the same width as you scroll across them.
export const SCROLL_LAYOUT_CONSTANTS: LayoutConstants = {
	cardW: 216,
	cardH: 70,
	gapX: 36,
	baseGapY: 14,
	visibleCols: Number.POSITIVE_INFINITY // unused in scroll mode; computeFullLayout ignores it
};

/** Breakpoints (viewport width, px) below which each preset applies. */
export const BREAKPOINTS = { tablet: 1024, mobile: 640 } as const;

/**
 * Picks the layout preset for a given viewport width (SSR-safe: pass 0 for a
 * safe desktop default when width is unknown, e.g. before mount). The mobile
 * tier's card width is additionally clamped to what actually fits next to the
 * nav buttons at this exact viewport, so it never overflows on narrow phones.
 */
export function constantsForWidth(viewportWidth: number): LayoutConstants {
	if (viewportWidth > 0 && viewportWidth < BREAKPOINTS.mobile) {
		const fitted = Math.round(
			Math.min(MOBILE_MAX_CARD_W, Math.max(MOBILE_MIN_CARD_W, viewportWidth - MOBILE_NAV_CHROME))
		);
		return { ...MOBILE_LAYOUT_CONSTANTS, cardW: fitted };
	}
	if (viewportWidth > 0 && viewportWidth < BREAKPOINTS.tablet) return TABLET_LAYOUT_CONSTANTS;
	return DESKTOP_LAYOUT_CONSTANTS;
}

/**
 * Every round after the first must have exactly half the matches of the round
 * before it (standard single-elim). Returns a human-readable problem
 * description, or null if the bracket is well-formed. Callers should surface
 * this rather than silently rendering a broken layout.
 */
export function validateRounds(rounds: Round[]): string | null {
	if (rounds.length === 0) return 'Bracket has no rounds.';
	for (let i = 0; i < rounds.length; i++) {
		const count = rounds[i].matches.length;
		if (count < 1) return `Round "${rounds[i].name}" has no matches.`;
		if (i === 0) continue;
		const prevCount = rounds[i - 1].matches.length;
		if (count * 2 !== prevCount) {
			return (
				`Round "${rounds[i].name}" has ${count} match${count === 1 ? '' : 'es'}, ` +
				`but round "${rounds[i - 1].name}" has ${prevCount} — expected exactly half ` +
				`(${prevCount / 2}) for a valid single-elimination bracket.`
			);
		}
	}
	return null;
}

/** Clamp the requested page so the window never runs past the bracket's edges. */
export function clampStart(requested: number, roundCount: number, visibleCols: number): number {
	const maxStart = Math.max(0, roundCount - visibleCols);
	return Math.min(Math.max(0, requested), maxStart);
}

/**
 * Computes slot geometry + paging bounds for the visible window starting at
 * `start`. Pure function of (rounds, start, constants) — no DOM access, so the
 * result can be diffed/animated directly from prop changes.
 */
export function computeBracketLayout(
	rounds: Round[],
	start: number,
	constants: LayoutConstants = DEFAULT_LAYOUT_CONSTANTS
): BracketLayout {
	const { cardW, cardH, gapX, baseGapY, visibleCols } = constants;
	const compactSlotHeight = cardH + baseGapY;
	const clampedStart = clampStart(start, rounds.length, visibleCols);
	const end = Math.min(clampedStart + visibleCols - 1, rounds.length - 1);

	const visibleRounds: VisibleRoundLayout[] = [];
	let prevSlots: MatchSlot[] | null = null;

	for (let roundIndex = clampedStart; roundIndex <= end; roundIndex++) {
		const round = rounds[roundIndex];
		const columnIndex = roundIndex - clampedStart;
		const slots: MatchSlot[] =
			columnIndex === 0
				? compactSlots(round.matches, compactSlotHeight)
				: fedSlots(round.matches, prevSlots as MatchSlot[]);

		const slotHeight = slots[0]?.slotHeight ?? compactSlotHeight;
		visibleRounds.push({ round, roundIndex, columnIndex, slotHeight, slots });
		prevSlots = slots;
	}

	const height = visibleRounds.reduce((max, col) => {
		const bottom = col.slots.reduce((b, s) => Math.max(b, s.slotTop + s.slotHeight), 0);
		return Math.max(max, bottom);
	}, 0);
	const width = visibleRounds.length * cardW + Math.max(0, visibleRounds.length - 1) * gapX;

	return {
		visibleRounds,
		width,
		height,
		canPrev: clampedStart > 0,
		canNext: end < rounds.length - 1,
		start: clampedStart,
		end
	};
}

/**
 * Lays out EVERY round at once — no window, no paging. Used on tablet/mobile,
 * where the bracket scrolls horizontally instead of paging. Same centering
 * recursion as computeBracketLayout (round 0 is the compact stack, every round
 * after inherits its slot geometry from its feeder pair in the previous
 * round) — just run across the whole `rounds` array instead of a 1–3 round
 * slice, so a card is still exactly centered between the two matches feeding
 * it no matter how many rounds are on screen simultaneously.
 */
export function computeFullLayout(
	rounds: Round[],
	constants: LayoutConstants = DEFAULT_LAYOUT_CONSTANTS
): FullBracketLayout {
	const { cardW, cardH, gapX, baseGapY } = constants;
	const compactSlotHeight = cardH + baseGapY;

	const layoutRounds: FullRoundLayout[] = [];
	let prevSlots: MatchSlot[] | null = null;

	for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
		const round = rounds[roundIndex];
		const slots: MatchSlot[] =
			roundIndex === 0
				? compactSlots(round.matches, compactSlotHeight)
				: fedSlots(round.matches, prevSlots as MatchSlot[]);

		const slotHeight = slots[0]?.slotHeight ?? compactSlotHeight;
		layoutRounds.push({ round, roundIndex, slotHeight, slots });
		prevSlots = slots;
	}

	const height = layoutRounds.reduce((max, col) => {
		const bottom = col.slots.reduce((b, s) => Math.max(b, s.slotTop + s.slotHeight), 0);
		return Math.max(max, bottom);
	}, 0);
	const width = layoutRounds.length * cardW + Math.max(0, layoutRounds.length - 1) * gapX;

	return { rounds: layoutRounds, width, height };
}

/** Leftmost visible column: one slot per match, evenly stacked. */
function compactSlots(matches: Match[], compactSlotHeight: number): MatchSlot[] {
	return matches.map((match, i) => ({
		match,
		slotTop: i * compactSlotHeight,
		slotHeight: compactSlotHeight
	}));
}

/**
 * A non-leftmost column: slot `i` spans from feeder `2i`'s top to feeder
 * `2i+1`'s bottom in the previous visible column, so a card centered in it
 * sits at the midpoint between its two feeders.
 */
function fedSlots(matches: Match[], feederSlots: MatchSlot[]): MatchSlot[] {
	return matches.map((match, i) => {
		const a = feederSlots[i * 2];
		const b = feederSlots[i * 2 + 1] ?? a; // defensive: validateRounds should prevent this
		const slotTop = a.slotTop;
		const slotHeight = b.slotTop + b.slotHeight - a.slotTop;
		return { match, slotTop, slotHeight };
	});
}
