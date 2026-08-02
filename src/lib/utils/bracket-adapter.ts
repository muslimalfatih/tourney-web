// Adapts laga-api's bracket read-model (EventBracket, from
// $lib/api/endpoints/events) into the Round[] shape PagedKnockoutBracket
// consumes ($lib/types/bracket). This is a RENDERING transform only — it is
// deliberately lossy in ways that don't matter for display (per-set detail
// collapses into one scoreline string) and never used to drive the
// score/schedule edit panel (BracketMatchPanel reads the original
// EventBracket directly, keyed by match id, completely independent of this
// adapter — see the organizer event page's `matchById`/`openMatch`).
import type { BracketMatch, BracketRound, BracketSlot, EventBracket } from '$lib/api/endpoints/events';
import type { Match, MatchSide, MatchStatus, Round } from '$lib/types/bracket';

// laga-api's match_status enum (generated/types.ts) → the new system's
// display-oriented MatchStatus. 'completed' is the only renamed value; every
// other backend literal has a same-named or intentionally-collapsed member.
const STATUS_MAP: Record<string, MatchStatus> = {
	pending: 'pending',
	scheduled: 'scheduled',
	live: 'live',
	completed: 'finished',
	walkover: 'walkover',
	bye: 'bye'
};

function toStatus(raw: string): MatchStatus {
	return STATUS_MAP[raw] ?? 'upcoming'; // unknown/future backend status → safest generic bucket
}

function toSide(slot: BracketSlot | undefined, winnerParticipantId: string | null): MatchSide {
	if (!slot) return { team: null, score: null };
	return {
		team: slot.participant_id
			? { id: slot.participant_id, name: slot.display_name ?? 'Unknown', seed: slot.seed }
			: null,
		score: null, // superseded by scoreLine below when the match has sets
		sourceLabel: slot.source_label
	};
}

// Space-joined per-set games, e.g. "6 4 6" — exactly what the renderer this
// replaces showed (BurgundyMatchNode.games()), so a played match reads
// identically to before rather than collapsing to a single summary number.
function scoreLine(match: BracketMatch, side: 1 | 2): string | null {
	if (!match.sets?.length) return null;
	return match.sets.map((s) => (side === 1 ? s.p1 : s.p2)).join(' ');
}

function toWinner(match: BracketMatch, home: MatchSide, away: MatchSide): 'home' | 'away' | null {
	if (!match.winner_participant_id) return null;
	if (home.team?.id === match.winner_participant_id) return 'home';
	if (away.team?.id === match.winner_participant_id) return 'away';
	return null; // winner id doesn't match either resolved slot — leave unmarked rather than guess
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

function toLabels(scheduledAt: string | null): { dateLabel: string; timeLabel: string | null } {
	if (!scheduledAt) return { dateLabel: 'TBD', timeLabel: null };
	const d = new Date(scheduledAt);
	if (Number.isNaN(d.getTime())) return { dateLabel: 'TBD', timeLabel: null };
	return { dateLabel: dateFmt.format(d), timeLabel: timeFmt.format(d) };
}

function toMatch(bm: BracketMatch): Match {
	const slot1 = bm.participants.find((p) => p.slot === 1);
	const slot2 = bm.participants.find((p) => p.slot === 2);
	const home = toSide(slot1, bm.winner_participant_id);
	const away = toSide(slot2, bm.winner_participant_id);
	home.scoreLine = scoreLine(bm, 1);
	away.scoreLine = scoreLine(bm, 2);
	const { dateLabel, timeLabel } = toLabels(bm.scheduled_at);

	return {
		id: bm.id,
		matchNumber: bm.match_no,
		dateLabel,
		timeLabel,
		status: toStatus(bm.status),
		home,
		away,
		winner: toWinner(bm, home, away)
	};
}

function toRound(br: BracketRound): Round {
	return {
		id: String(br.round_number),
		name: br.name,
		matches: br.matches.map(toMatch)
	};
}

/**
 * Converts BracketRound[] (laga-api's flat rounds array — used both as
 * EventBracket.rounds and as GroupKnockout.knockout) into Round[], trimming
 * trailing rounds that have no matches yet — a later round the backend hasn't
 * generated/seeded, the same "not ready to render" state the old
 * BurgundyBracket/GroupKnockoutView checked via `hasRounds`/`hasKnockout`
 * before rendering at all. Only TRAILING empty rounds are dropped; an empty
 * round in the middle of real rounds is left in place and reported as-is,
 * since that would indicate an actual data problem worth surfacing rather
 * than silently hiding.
 *
 * Returns `[]` when there's nothing renderable — callers should treat that the
 * same way the old system's `hasRounds`/`hasKnockout` checks did: show an
 * empty state instead of handing an empty array to PagedKnockoutBracket
 * (which would report it as a validation error, not a normal "not generated
 * yet" state).
 */
export function adaptBracketRounds(rounds: BracketRound[]): Round[] {
	const mapped = rounds.map(toRound);
	let end = mapped.length;
	while (end > 0 && mapped[end - 1].matches.length === 0) end--;
	return mapped.slice(0, end);
}

/** Convenience wrapper for the common case of adapting a whole EventBracket. */
export function adaptEventBracket(bracket: EventBracket): Round[] {
	return adaptBracketRounds(bracket.rounds);
}
