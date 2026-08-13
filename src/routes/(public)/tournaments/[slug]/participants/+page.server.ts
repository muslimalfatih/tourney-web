import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Renamed to /players — shorter and it is what the page actually shows.
export const load: PageServerLoad = ({ params }) => {
	redirect(301, `/tournaments/${params.slug}/players`);
};
