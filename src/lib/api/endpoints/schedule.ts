import { apiGet, apiPost, apiPatch, apiDelete, type RequestOptions } from '$lib/api/client';

export interface Court {
	id: string;
	name: string;
	sort_order: number;
}

export interface ScheduleSlot {
	id: string;
	court_id: string;
	court_name: string;
	match_id: string | null;
	match_label: string | null;
	// Nullable together with match_id/match_label — a "held" slot (court
	// blocked, nothing assigned yet) has none of these. event_name is the
	// division's public_display_name, already resolved server-side, so a
	// multi-division schedule can show which division each row belongs to.
	event_id: string | null;
	event_name: string | null;
	match_status: 'scheduled' | 'live' | 'completed' | null;
	starts_at: string;
	ends_at: string;
}

export function listCourts(tournamentId: string, opts?: RequestOptions) {
	return apiGet<Court[]>(`/tournaments/${tournamentId}/courts`, opts);
}

export function createCourt(
	tournamentId: string,
	input: { name: string; sort_order?: number },
	opts?: RequestOptions
) {
	return apiPost<Court>(`/tournaments/${tournamentId}/courts`, input, opts);
}

export function listSchedule(tournamentId: string, opts?: RequestOptions) {
	return apiGet<ScheduleSlot[]>(`/tournaments/${tournamentId}/schedule`, opts);
}

export function listPublicSchedule(slug: string, opts?: RequestOptions) {
	return apiGet<ScheduleSlot[]>(`/public/tournaments/${slug}/schedule`, opts);
}

/** One existing slot that clashes with a requested write (422 details). */
export interface ScheduleConflict {
	type: 'court_overlap' | 'participant_overlap' | 'rest_buffer';
	slot_id: string;
	court_id: string;
	court_name: string;
	match_id?: string | null;
	match_label?: string | null;
	starts_at: string;
	ends_at: string;
}

export interface CreateSlotInput {
	tournament_id: string;
	court_id: string;
	match_id?: string | null;
	starts_at: string;
	ends_at: string;
	/** Acknowledge rest_buffer warnings from a prior 422 and schedule anyway. */
	override_rest_buffer?: boolean;
}

export function createSlot(input: CreateSlotInput, opts?: RequestOptions) {
	return apiPost<ScheduleSlot>('/schedule/slots', input, opts);
}

export interface UpdateSlotInput {
	court_id: string;
	match_id?: string | null;
	starts_at: string;
	ends_at: string;
	override_rest_buffer?: boolean;
}

export function updateSlot(id: string, input: UpdateSlotInput, opts?: RequestOptions) {
	return apiPatch<ScheduleSlot>(`/schedule/slots/${id}`, input, opts);
}

export function deleteSlot(id: string, opts?: RequestOptions) {
	return apiDelete<void>(`/schedule/slots/${id}`, opts);
}
