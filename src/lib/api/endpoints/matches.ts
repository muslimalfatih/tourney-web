import { apiGet, apiPatch, type RequestOptions } from '$lib/api/client';

export interface SetScore {
	set_number: number;
	p1_games: number;
	p2_games: number;
	p1_tiebreak?: number | null;
	p2_tiebreak?: number | null;
}

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
	body: { sets: SetScore[]; complete: boolean },
	opts?: RequestOptions
) {
	return apiPatch<MatchDetail>(`/matches/${id}/score`, body, opts);
}

export function setMatchStatus(
	id: string,
	status: 'scheduled' | 'live' | 'completed',
	opts?: RequestOptions
) {
	return apiPatch<MatchDetail>(`/matches/${id}/status`, { status }, opts);
}
