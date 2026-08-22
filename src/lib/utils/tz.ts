// Tournament-local date/time formatting (Phase 3.6). Every function takes the
// tournament's IANA zone explicitly — nothing here reads the viewer's, the
// server's, or the browser's timezone, so two viewers on different continents
// see the same tournament-local schedule. API timestamps stay UTC/RFC3339;
// this is presentation only.
export const DEFAULT_TIMEZONE = 'Asia/Makassar';

function fmt(
	iso: string,
	tz: string,
	opts: Intl.DateTimeFormatOptions,
	locale = 'en-GB'
): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	try {
		return new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz || DEFAULT_TIMEZONE }).format(d);
	} catch {
		// Unknown zone (stale client cache, tampered payload) — fall back to the
		// platform default rather than the viewer's zone.
		return new Intl.DateTimeFormat(locale, { ...opts, timeZone: DEFAULT_TIMEZONE }).format(d);
	}
}

/** Stable YYYY-MM-DD group/sort key in tournament-local time (en-CA renders ISO order). */
export function zonedDayKey(iso: string, tz: string): string {
	return fmt(iso, tz, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
}

/** "Sunday, 12 July" / "Sun, 12 Jul" in tournament-local time. */
export function zonedDayLabel(iso: string, tz: string, style: 'long' | 'short' = 'long'): string {
	return fmt(
		iso,
		tz,
		style === 'long'
			? { weekday: 'long', day: 'numeric', month: 'long' }
			: { weekday: 'short', day: 'numeric', month: 'short' }
	);
}

/** "09:30" in tournament-local time. */
export function zonedTime(iso: string, tz: string): string {
	return fmt(iso, tz, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "Jul 12" — compact date for bracket match cards. */
export function zonedShortDate(iso: string, tz: string): string {
	return fmt(iso, tz, { month: 'short', day: 'numeric' }, 'en-US');
}
