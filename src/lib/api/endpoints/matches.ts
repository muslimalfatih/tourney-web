import { apiGet, apiPatch, type RequestOptions } from '$lib/api/client';

export interface SetScore {
	set_number: number;
	games_a: number;
	games_b: number;
	// Tiebreak metadata is separate from games: a 7-6 set requires the
	// tiebreak points here (winner >= 7, leading by two).
	tiebreak_a?: number | null;
	tiebreak_b?: number | null;
}

/** How a result ended. `walkover`/`retired` require winner_slot. */
export type Completion = 'incomplete' | 'normal' | 'walkover' | 'retired' | 'cancelled';

export interface MatchSlot {
	slot: number;
	participant_id: string | null;
	display_name: string | null;
	seed: number | null;
}

export interface MatchDetail {
	id: string;
	event_id: string;
	match_no: number;
	status: string;
	scheduled_at: string | null;
	started_at: string | null;
	completed_at: string | null;
	winner_participant_id: string | null;
	next_match_id: string | null;
	next_slot: number | null;
	participants: MatchSlot[];
	sets: SetScore[];
}

export function listEventMatches(eventId: string, opts?: RequestOptions) {
	return apiGet<MatchDetail[]>(`/events/${eventId}/matches`, opts);
}

export function getMatch(id: string, opts?: RequestOptions) {
	return apiGet<MatchDetail>(`/public/matches/${id}`, opts);
}

export function submitScore(
	id: string,
	body: { sets: SetScore[]; completion: Completion; winner_slot?: number },
	opts?: RequestOptions
) {
	return apiPatch<MatchDetail>(`/matches/${id}/score`, body, opts);
}

export function setMatchStatus(
	id: string,
	// 'completed' is not settable here — decided results go through submitScore.
	status: 'scheduled' | 'live',
	opts?: RequestOptions
) {
	return apiPatch<MatchDetail>(`/matches/${id}/status`, { status }, opts);
}
