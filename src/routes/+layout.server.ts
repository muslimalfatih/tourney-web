import type { LayoutServerLoad } from './$types';

/** Expose the resolved session (from hooks.server.ts) to every page. */
export const load: LayoutServerLoad = async ({ locals }) => {
	return { session: locals.session };
};
