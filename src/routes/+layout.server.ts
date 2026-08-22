import type { LayoutServerLoad } from './$types';

/**
 * Expose ONLY the user identity to pages — never the session's tokens.
 *
 * The previous version returned `locals.session` whole, which serialized the
 * raw access JWT into every page's client data payload (visible in
 * __data.json / page.data), silently defeating the httpOnly-cookie design in
 * $lib/server/session.ts. Server-side loads and actions keep full token
 * access via `locals.session`; the client only ever needs to know who is
 * signed in.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { user: locals.session.user ?? null };
};
