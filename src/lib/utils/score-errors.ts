// Phase 4A: turn the API's structured score errors into one readable sentence
// for the organizer. The server stays authoritative — this only PRESENTS its
// verdicts (422 invalid_score violations, 409 downstream_phase_locked slots);
// it never re-validates.

export interface ScoreViolation {
	set?: number;
	field?: string;
	rule?: string;
	message?: string;
}

export interface LockedSlotDetail {
	match_no?: number;
	slot?: number;
	status?: string;
}

interface ApiErrorLike {
	code: string;
	message: string;
	details?: unknown;
}

/** One violation → "Set 2: a 7-6 set needs its tiebreak score". */
function violationLine(v: ScoreViolation): string {
	const msg = v.message || v.rule || 'invalid score';
	return v.set && v.set > 0 ? `Set ${v.set}: ${msg}` : msg;
}

/**
 * describeScoreError: readable text for a failed score submission. Handles the
 * two structured families (invalid_score, downstream_phase_locked) and falls
 * back to the server's own message for everything else.
 */
export function describeScoreError(e: ApiErrorLike): string {
	const d = (e.details ?? {}) as {
		violations?: ScoreViolation[];
		locked?: LockedSlotDetail[];
	};

	if (e.code === 'invalid_score' && d.violations?.length) {
		return d.violations.map(violationLine).join(' · ');
	}

	if (e.code === 'downstream_phase_locked' && d.locked?.length) {
		const where = d.locked
			.map((l) => `Match ${l.match_no ?? '?'} (side ${l.slot ?? '?'}, ${l.status ?? 'started'})`)
			.join(', ');
		return `Later matches already depend on this result: ${where}. Correct or reset them first.`;
	}

	return e.message || 'Could not save the score.';
}

/** Success toast for a score submission, specific to how the match ended. */
export function scoreSuccessMessage(completion: string): string {
	switch (completion) {
		case 'normal':
			return 'Match completed';
		case 'incomplete':
			return 'Score saved';
		case 'walkover':
			return 'Walkover recorded';
		case 'retired':
			return 'Retirement recorded';
		case 'cancelled':
			return 'Match cancelled';
		default:
			return 'Result recorded';
	}
}
