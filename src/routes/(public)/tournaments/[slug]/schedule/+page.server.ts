import type { PageServerLoad } from './$types';
import { listPublicSchedule } from '$lib/api/endpoints/schedule';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const schedule = await listPublicSchedule(params.slug, { fetch });
		return { schedule };
	} catch {
		return { schedule: [] };
	}
};
