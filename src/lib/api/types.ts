/**
 * Domain types consumed across the app. These are hand-authored for the
 * skeleton; once the OpenAPI spec stabilises, run `pnpm gen:api` to regenerate
 * `generated/types.ts` from laga-api/api/openapi.yaml and re-export the
 * canonical shapes from here. Keeping a single import surface (`$lib/api/types`)
 * means switching to generated types later touches only this file.
 */

export type UserRole = 'super_admin' | 'organizer';

export interface User {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	org_id: string | null;
}

export type TournamentStatus = 'draft' | 'published' | 'archived' | 'suspended';

export interface Tournament {
	id: string;
	name: string;
	slug: string;
	sport: string;
	status: TournamentStatus;
}

export type EventFormat = 'single_elim' | 'round_robin' | 'group_knockout';
export type EventDiscipline = 'singles' | 'doubles';

export interface EventDivision {
	id: string;
	name: string;
	discipline: EventDiscipline;
	format: EventFormat;
}

export interface PublicTournament extends Tournament {
	branding: Record<string, unknown>;
	events: EventDivision[];
}

export type MatchStatus =
	| 'pending'
	| 'scheduled'
	| 'live'
	| 'completed'
	| 'walkover'
	| 'bye';

export interface SetScore {
	set_number: number;
	p1_games: number;
	p2_games: number;
	p1_tiebreak?: number | null;
	p2_tiebreak?: number | null;
}

export interface MatchParticipant {
	slot: 1 | 2;
	participant_id: string | null;
	display_name: string | null;
	seed: number | null;
}

export interface Match {
	id: string;
	status: MatchStatus;
	court?: string | null;
	scheduled_at?: string | null;
	participants: MatchParticipant[];
	sets: SetScore[];
	winner_participant_id?: string | null;
}

/** Canonical bracket shape the custom Svelte renderer consumes. */
export interface BracketRound {
	round_number: number;
	name: string;
	matches: Match[];
}

export interface Bracket {
	event_id: string;
	format: EventFormat;
	rounds: BracketRound[];
}
