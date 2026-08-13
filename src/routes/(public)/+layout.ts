// Disables server-side rendering for the whole public (user-facing) route
// group — the landing page and every /tournaments/... page. The (admin) and
// (auth) route groups are untouched and stay fully SSR'd.
//
// Concrete tradeoff, confirmed before implementing: the first HTML response
// for these routes is now an empty shell — SvelteKit runs no load functions
// server-side for it, so nothing is baked into the initial markup. Everything
// (hero, bracket, standings, the <title>/og: tags TournamentView.svelte sets)
// only exists after the browser downloads and runs the JS bundle. Link
// unfurlers (WhatsApp, Slack, Twitter, iMessage) and most search-engine
// crawlers don't execute JavaScript, so a freshly-shared tournament link will
// show no title/description/preview to them anymore — that undoes the share-
// preview work from recent turns for anyone who hasn't already opened the
// page once. csr stays on (the default), so the app is fully interactive
// after that first JS load; this only removes the server-rendered HTML pass.
//
// Existing +page.server.ts / +layout.server.ts loaders under this group are
// NOT dead code and don't need converting: SvelteKit still calls them, just
// via a client-triggered request to their data endpoint after the shell
// mounts, instead of inline during SSR. Same data, same loaders, later.
export const ssr = false;
