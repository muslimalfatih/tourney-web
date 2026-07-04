import { apiGet, apiList, apiPost, apiPatch, type RequestOptions } from '$lib/api/client';
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
	slug?: string;
	sport: 'tennis';
	location?: string;
	starts_on?: string;
	ends_on?: string;
	branding?: Record<string, unknown>;
}

export function createTournament(input: CreateTournamentInput, opts?: RequestOptions) {
	return apiPost<Tournament>('/tournaments', input, opts);
}

export function getTournament(id: string, opts?: RequestOptions) {
	return apiGet<Tournament>(`/tournaments/${id}`, opts);
}

export function updateTournament(
	id: string,
	patch: Partial<Pick<CreateTournamentInput, 'name' | 'location'>> & {
		starts_on?: string;
		ends_on?: string;
	},
	opts?: RequestOptions
) {
	return apiPatch<Tournament>(`/tournaments/${id}`, patch, opts);
}

export function publishTournament(id: string, opts?: RequestOptions) {
	return apiPost<Tournament>(`/tournaments/${id}/publish`, undefined, opts);
}

export function unpublishTournament(id: string, opts?: RequestOptions) {
	return apiPost<Tournament>(`/tournaments/${id}/unpublish`, undefined, opts);
}
