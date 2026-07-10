import { apiGet, apiPost, apiPatch, apiDelete, type RequestOptions } from '$lib/api/client';

export interface Participant {
	id: string;
	event_id: string;
	player_id: string | null;
	team_id: string | null;
	display_name: string;
	seed: number | null;
}

export function listParticipants(eventId: string, opts?: RequestOptions) {
	return apiGet<Participant[]>(`/events/${eventId}/participants`, opts);
}

// Public roster for an event (only if the tournament is published).
export function listPublicParticipants(eventId: string, opts?: RequestOptions) {
	return apiGet<Participant[]>(`/public/events/${eventId}/participants`, opts);
}

export function addParticipant(
	eventId: string,
	input: { display_name: string; seed?: number | null },
	opts?: RequestOptions
) {
	return apiPost<Participant>(`/events/${eventId}/participants`, input, opts);
}

export function setSeed(id: string, seed: number | null, opts?: RequestOptions) {
	return apiPatch<Participant>(`/participants/${id}/seed`, { seed }, opts);
}

// Renames a participant (and the underlying player/team) in place.
export function renameParticipant(id: string, display_name: string, opts?: RequestOptions) {
	return apiPatch<Participant>(`/participants/${id}`, { display_name }, opts);
}

export function deleteParticipant(id: string, opts?: RequestOptions) {
	return apiDelete<void>(`/participants/${id}`, opts);
}
