import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Folded into the single public page's view switcher.
export const load: PageServerLoad = ({ params }) => {
	redirect(307, `/tournaments/${params.slug}/bracket?view=schedule`);
};
