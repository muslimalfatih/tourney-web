// Phase 4A: shared rendering of the API's structured scheduling errors
// (422 schedule_conflict / insufficient_rest, 409 schedule_state_conflict).
// Times render in the TOURNAMENT's zone. Presentation only — the server owns
// the rules.
import type { ScheduleConflict } from '$lib/api/endpoints/schedule';
import { zonedTime } from './tz';

export function fmtConflicts(list: ScheduleConflict[], tz: string): string {
	const t = (iso: string) => zonedTime(iso, tz);
	return list
		.map((c) => {
			const why =
				c.type === 'court_overlap'
					? 'court busy'
					: c.type === 'participant_overlap'
						? 'players already on court'
						: 'short rest';
			return `${c.court_name} ${t(c.starts_at)}–${t(c.ends_at)} (${why}${c.match_label ? `: ${c.match_label}` : ''})`;
		})
		.join('; ');
}

export interface ScheduleFailure {
	/** Hard failure text (conflicts, races, anything unrecoverable in place). */
	error?: string;
	/** Rest-buffer warning text — the caller decides whether to offer override. */
	restWarning?: string;
}

export function describeScheduleError(
	e: { code: string; message: string; details?: unknown },
	tz: string
): ScheduleFailure {
	const d = (e.details ?? {}) as { conflicts?: ScheduleConflict[]; warnings?: ScheduleConflict[] };
	if (e.code === 'insufficient_rest') {
		return { restWarning: `Less than 30 minutes rest for: ${fmtConflicts(d.warnings ?? [], tz)}.` };
	}
	if (e.code === 'schedule_conflict') {
		return { error: `Schedule conflict — ${fmtConflicts(d.conflicts ?? [], tz)}.` };
	}
	if (e.code === 'schedule_state_conflict') {
		return { error: 'The schedule changed while saving — reload and try again.' };
	}
	return { error: e.message };
}
