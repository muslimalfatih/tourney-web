import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The public tournament experience is a single page (the bracket route with a
// view switcher). The old Overview root redirects there.
export const load: PageServerLoad = ({ params }) => {
	redirect(307, `/tournaments/${params.slug}/bracket`);
};
