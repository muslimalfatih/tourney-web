import type { PageServerLoad } from './$types';
import { listAuditLogs } from '$lib/api/endpoints/admin';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	try {
		const { data } = await listAuditLogs({ fetch, token: locals.session.accessToken });
		return { logs: data };
	} catch {
		return { logs: [] };
	}
};
