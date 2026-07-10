import { apiGet, apiPost, apiDelete, type RequestOptions } from '$lib/api/client';
import type { EventDivision, EventFormat, EventDiscipline } from '$lib/api/types';

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

export function deleteEvent(id: string, opts?: RequestOptions) {
	return apiDelete<void>(`/events/${id}`, opts);
}

export function generateDraw(eventId: string, opts?: RequestOptions) {
	return apiPost<{ event_id: string; matches: number; generated: boolean }>(
		`/events/${eventId}/draw`,
		undefined,
		opts
	);
}

// One round-1 matchup submitted from the Match builder. Either side may be null
// for a bye; a fully-null pair is dropped server-side.
export interface BuildMatchInput {
	team_a_id: string | null;
	team_b_id: string | null;
}

export interface BuildBracketInput {
	pairing_mode: PairingMode;
	// Ignored by the server in 'auto' mode; required (and validated) in 'manual'.
	matches?: BuildMatchInput[];
}

// buildBracket runs the Match builder: builds a single-elim bracket from random
// pairs (auto) or explicit round-1 pairings (manual), overwriting any prior draw.
export function buildBracket(eventId: string, input: BuildBracketInput, opts?: RequestOptions) {
	return apiPost<{ event_id: string; matches: number; pairing_mode: PairingMode; generated: boolean }>(
		`/events/${eventId}/bracket/build`,
		input,
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

// Group-knockout read model: per-group standings + knockout bracket.
export interface GroupTable {
	name: string;
	standings: Standing[];
}
export interface GroupKnockout {
	event_id: string;
	groups: GroupTable[];
	knockout: BracketRound[];
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
