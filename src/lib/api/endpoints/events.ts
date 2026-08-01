import { apiGet, apiPost, apiPatch, apiPut, apiDelete, type RequestOptions } from '$lib/api/client';
import type { EventDivision, EventFormat, EventDiscipline, EventGender } from '$lib/api/types';

// How an event's round-1 pairs were decided (Match builder). 'auto' = random,
// 'manual' = organizer-supplied pairings.
export type PairingMode = 'auto' | 'manual';

// Event carries rolled-up counts from the API for list display.
export interface EventRow extends EventDivision {
	tournament_id: string;
	pairing_mode: PairingMode;
	participant_count: number;
	match_count: number;
}

export function listEvents(tournamentId: string, opts?: RequestOptions) {
	return apiGet<EventRow[]>(`/tournaments/${tournamentId}/events`, opts);
}

export function getEvent(id: string, opts?: RequestOptions) {
	return apiGet<EventRow>(`/events/${id}`, opts);
}

export interface CreateEventInput {
	name: string;
	discipline: EventDiscipline;
	format: EventFormat;
}

export function createEvent(tournamentId: string, input: CreateEventInput, opts?: RequestOptions) {
	return apiPost<EventRow>(`/tournaments/${tournamentId}/events`, input, opts);
}

// Patch an event's public-facing config. Omit a field to leave it unchanged;
// send category/public_display_name as '' to clear (backend trims), or a value
// to set. gender/is_public/public_order are plain overwrites when present.
export interface UpdateEventInput {
	category?: string | null;
	gender?: EventGender;
	is_public?: boolean;
	public_display_name?: string | null;
	public_order?: number;
}

export function updateEvent(id: string, input: UpdateEventInput, opts?: RequestOptions) {
	return apiPatch<EventRow>(`/events/${id}`, input, opts);
}

export function deleteEvent(id: string, opts?: RequestOptions) {
	return apiDelete<void>(`/events/${id}`, opts);
}

// One round-1 matchup submitted from the Match builder. Either side may be null
// for a bye; a fully-null pair is dropped server-side.
export interface BuildMatchInput {
	team_a_id: string | null;
	team_b_id: string | null;
}

// buildBracket runs the single-elim Match builder from explicit round-1 pairings
// (manual only), overwriting any prior draw.
export function buildBracket(
	eventId: string,
	matches: BuildMatchInput[],
	opts?: RequestOptions
) {
	return apiPost<{ event_id: string; matches: number; generated: boolean }>(
		`/events/${eventId}/bracket/build`,
		{ matches },
		opts
	);
}

// --- Round-robin manual fixtures ---
export function addManualMatch(
	eventId: string,
	team_a_id: string,
	team_b_id: string,
	opts?: RequestOptions
) {
	return apiPost<{ id: string; match_no: number }>(
		`/events/${eventId}/matches`,
		{ team_a_id, team_b_id },
		opts
	);
}

export function deleteManualMatch(matchId: string, opts?: RequestOptions) {
	return apiDelete<void>(`/matches/${matchId}`, opts);
}

// --- Group-knockout manual assignment + build ---
export interface GroupSetupInput {
	name: string;
	advance_count: number;
	team_ids: string[];
}

// setGroups assigns teams to groups and builds the group_knockout fixtures
// (round-robin per group + knockout skeleton). Overwrites any prior draw.
export function setGroups(eventId: string, groups: GroupSetupInput[], opts?: RequestOptions) {
	return apiPut<{ event_id: string; matches: number; generated: boolean }>(
		`/events/${eventId}/groups`,
		{ groups },
		opts
	);
}

// Bracket read model consumed by the custom Svelte renderer.
export interface BracketSlot {
	slot: number;
	participant_id: string | null;
	display_name: string | null;
	seed: number | null;
	source_label?: string | null;
}
export interface BracketSet {
	p1: number;
	p2: number;
}
export interface BracketMatch {
	id: string;
	match_no: number;
	status: string;
	winner_participant_id: string | null;
	court_id: string | null;
	court_name: string | null;
	scheduled_at: string | null;
	participants: BracketSlot[];
	sets: BracketSet[];
}
export interface BracketRound {
	round_number: number;
	name: string;
	matches: BracketMatch[];
}
export interface EventBracket {
	event_id: string;
	format: string;
	rounds: BracketRound[];
}

export function getEventBracket(eventId: string, opts?: RequestOptions) {
	return apiGet<EventBracket>(`/public/events/${eventId}/bracket`, opts);
}

// Organizer read models (ungated, org-scoped) — used by the dashboard while the
// tournament is still a draft. The public /public/... variants require the
// tournament to be published + the event public.
export function getOrgEventBracket(eventId: string, opts?: RequestOptions) {
	return apiGet<EventBracket>(`/events/${eventId}/bracket`, opts);
}

// Round-robin standings.
export interface Standing {
	participant_id: string;
	display_name: string;
	seed: number | null;
	played: number;
	won: number;
	lost: number;
	sets_for: number;
	sets_against: number;
}

export function getEventStandings(eventId: string, opts?: RequestOptions) {
	return apiGet<{ event_id: string; standings: Standing[] }>(
		`/public/events/${eventId}/standings`,
		opts
	);
}

export function getOrgEventStandings(eventId: string, opts?: RequestOptions) {
	return apiGet<{ event_id: string; standings: Standing[] }>(
		`/events/${eventId}/standings`,
		opts
	);
}

// Group-knockout read model: per-group standings + knockout bracket.
export interface GroupTable {
	id: string;
	name: string;
	advance_count: number;
	standings: Standing[];
}
export interface GroupKnockout {
	event_id: string;
	groups: GroupTable[];
	knockout: BracketRound[];
}

// Set how many top teams advance from one group (organizer). Returns the new
// count. The read model (getGroupKnockout) recomputes on next fetch.
export function updateGroupAdvance(
	eventId: string,
	groupId: string,
	advance_count: number,
	opts?: RequestOptions
) {
	return apiPatch<{ event_id: string; group_id: string; advance_count: number }>(
		`/events/${eventId}/groups/${groupId}`,
		{ advance_count },
		opts
	);
}

export function getOrgGroupKnockout(eventId: string, opts?: RequestOptions) {
	return apiGet<GroupKnockout>(`/events/${eventId}/groups`, opts);
}

export function getGroupKnockout(eventId: string, opts?: RequestOptions) {
	return apiGet<GroupKnockout>(`/public/events/${eventId}/groups`, opts);
}

export function resolveGroups(eventId: string, opts?: RequestOptions) {
	return apiPost<{ event_id: string; filled: number }>(
		`/events/${eventId}/resolve-groups`,
		undefined,
		opts
	);
}
