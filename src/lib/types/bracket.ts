// Data model for a paged single-elimination knockout bracket. Kept separate
// from laga's live bracket types ($lib/api/endpoints/events) — this tree is a
// self-contained, reusable component driven by whatever shape the caller
// provides, not by laga-api's response shape.

export type Team = {
	id: string;
	name: string;
	code?: string | null;
	// Seed number shown as a small badge next to the team name, e.g. "#3". Not
	// used by every caller — laga-api's bracket read-model carries it per slot.
	seed?: number | null;
};

export type MatchSide = {
	team: Team | null;
	score: number | null;
	penalties?: number | null;
	// Pre-formatted score display, e.g. "6 4 6" for a set-by-set scoreline —
	// takes precedence over `score` when present. Exists because some sources
	// (laga-api's bracket read-model) track per-set games rather than a single
	// running number, and set-by-set is what should actually render; `score`
	// stays the simple numeric case for callers (like the demo mock data) that
	// only ever have one number per side.
	scoreLine?: string | null;
	// Display label for a slot that's genuinely undecided but NOT a bare TBD —
	// e.g. "Winner of QF1" while an earlier round is still in progress. Only
	// meaningful when `team` is null; ignored otherwise. When both this and
	// `team` are null, the card falls back to a plain "TBD".
	sourceLabel?: string | null;
};

// 'live' = in progress right now. 'bye' = decided without play (the other side
// never showed up / no opponent — the winner is real, but ' Bye' shows in the
// empty slot rather than a name). 'walkover' = decided without play but BOTH
// sides are real teams (one forfeited) — closer to 'finished' visually but
// worth its own tag rather than silently reading as a played result.
// 'pending'/'scheduled' both collapse to 'upcoming' for display purposes but
// are kept distinct here since some callers (e.g. showing a court/time only
// once scheduled) care about the difference.
export type MatchStatus =
	| 'pending'
	| 'scheduled'
	| 'live'
	| 'finished'
	| 'walkover'
	| 'bye'
	| 'upcoming';

export type MatchWinner = 'home' | 'away' | null;

export type Match = {
	id: string;
	// Organizer/backend-supplied ordinal within its round, e.g. "Match 3" — not
	// every caller has one (the demo mock data doesn't), so it's optional.
	matchNumber?: number | null;
	dateLabel: string;
	timeLabel?: string | null;
	status: MatchStatus;
	home: MatchSide;
	away: MatchSide;
	winner?: MatchWinner;
};

export type Round = {
	id: string;
	name: string;
	matches: Match[];
};

// --- Layout ------------------------------------------------------------

// One match card's vertical placement within its column. `slotTop`/`slotHeight`
// describe the slot (the space reserved for the match + its share of the
// column's connector geometry); the card itself is centered inside that slot
// by the component, not by this layout data.
export type MatchSlot = {
	match: Match;
	slotTop: number;
	slotHeight: number;
};

export type VisibleRoundLayout = {
	round: Round;
	// Index into the *original* rounds array (not the visible window) — used
	// to key columns stably across pages and to look up feeder rounds.
	roundIndex: number;
	// Position within the current visible window (0-based, left to right).
	columnIndex: number;
	slotHeight: number;
	slots: MatchSlot[];
};

export type BracketLayout = {
	visibleRounds: VisibleRoundLayout[];
	width: number;
	height: number;
	canPrev: boolean;
	canNext: boolean;
	// Start/end are round indices into the full `rounds` array — the current
	// visible window is rounds[start..end] inclusive.
	start: number;
	end: number;
};

// --- Full (unpaged, all-rounds-at-once) layout --------------------------
// Used on tablet/mobile, where every round renders in one continuously
// scrollable row instead of a paged window. Same slot-centering math as
// VisibleRoundLayout/BracketLayout — just run across the whole `rounds` array
// with nothing clipped, so there's no `canPrev`/`canNext`/`start`/`end`, and
// `columnIndex` always equals `roundIndex` since nothing is windowed.
export type FullRoundLayout = {
	round: Round;
	roundIndex: number;
	slotHeight: number;
	slots: MatchSlot[];
};

export type FullBracketLayout = {
	rounds: FullRoundLayout[];
	width: number;
	height: number;
};
