/**
 * Domain types consumed across the app. These are hand-authored for the
 * skeleton; once the OpenAPI spec stabilises, run `pnpm gen:api` to regenerate
 * `generated/types.ts` from tourney-api/api/openapi.yaml and re-export the
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
	description?: string | null;
	status: TournamentStatus;
	location?: string | null;
	starts_on?: string | null;
	ends_on?: string | null;
	/** IANA presentation zone (default Asia/Makassar); all timestamps stay UTC. */
	timezone: string;
	published_at?: string | null;
	event_count?: number;
}

export type EventFormat = 'single_elim' | 'round_robin' | 'group_knockout';
export type EventDiscipline = 'singles' | 'doubles';
export type EventGender = 'men' | 'women' | 'mixed';

export interface EventDivision {
	id: string;
	name: string;
	/** URL identifier, unique within the tournament (backend migration 00005).
	 *  Assigned once at create and never recomputed, so links survive renames. */
	slug: string;
	discipline: EventDiscipline;
	format: EventFormat;
	// Public-facing config (backend migration 00003). Present on all event reads.
	category?: string | null;
	gender: EventGender;
	// Organizer reads carry is_public; the public payload omits it (its events are
	// implicitly public), so it's optional.
	is_public?: boolean;
	public_display_name?: string | null;
	public_order: number;
	// Derived server-side from format (single source of truth).
	has_group_stage: boolean;
	has_knockout_stage: boolean;
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
	games_a: number;
	games_b: number;
	tiebreak_a?: number | null;
	tiebreak_b?: number | null;
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
