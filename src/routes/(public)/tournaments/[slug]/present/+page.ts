import type { PageLoad } from './$types';
import { loadDeck } from './deck';

// SvelteKit allows only its own exports from +page.ts, so the deck loader
// lives in deck.ts (shared with the component's SSE refetch path).
export const load: PageLoad = async ({ parent, fetch, params }) => {
	const { tournament } = await parent();
	const deck = await loadDeck(params.slug, tournament.events ?? [], fetch);
	return { tournament, deck };
};
