import { apiGet, apiList, apiPost, type RequestOptions } from '$lib/api/client';
import type { Bracket, Match, PublicTournament, Tournament } from '$lib/api/types';

// --- Public (SSR) reads ---

export function getPublicTournament(slug: string, opts?: RequestOptions) {
	return apiGet<PublicTournament>(`/public/tournaments/${slug}`, opts);
}

export function getPublicBracket(eventId: string, opts?: RequestOptions) {
	return apiGet<Bracket>(`/public/events/${eventId}/bracket`, opts);
}

export function getPublicMatch(matchId: string, opts?: RequestOptions) {
	return apiGet<Match>(`/public/matches/${matchId}`, opts);
}

// --- Organizer ---

export function listTournaments(opts?: RequestOptions) {
	return apiList<Tournament>('/tournaments', opts);
}

export interface CreateTournamentInput {
	name: string;
	slug: string;
	sport: 'tennis';
	location?: string;
	branding?: Record<string, unknown>;
}

export function createTournament(input: CreateTournamentInput, opts?: RequestOptions) {
	return apiPost<Tournament>('/tournaments', input, opts);
}

export function publishTournament(id: string, opts?: RequestOptions) {
	return apiPost<Tournament>(`/tournaments/${id}/publish`, undefined, opts);
}
