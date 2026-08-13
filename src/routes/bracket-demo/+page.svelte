<script lang="ts">
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import LightBoard from '$lib/components/ui/LightBoard.svelte';
	import { mockBracketRounds } from '$lib/data/mock-bracket';
</script>

<svelte:head>
	<title>Paged Knockout Bracket — Demo</title>
</svelte:head>

<main>
	<!-- Explicit dark colors, not the theme tokens — this page stays a
	     permanent dark showcase independent of the app palette (now burgundy
	     again), matching PagedKnockoutBracket's own --bk-* hardcoded fallbacks
	     just below it on this same page. LightBoard defaults to --color-*
	     tokens (by design, so it matches whatever page it's mounted on
	     elsewhere in the app) — that default is wrong for this one page on
	     purpose, hence the override. -->
	<LightBoard
		text="32 teams - single elimination - round of 32 to final"
		rows={9}
		class="mx-auto mb-8 max-w-240"
		colors={{ background: '#0e1015', textDim: '#2a2e37', textBright: '#e7e9ee', drawLine: '#5b8def' }}
	/>

	<h1>Paged Knockout Bracket</h1>
	<p>
		32-team single elimination. Shows 3 rounds at a time — use the arrows (or ←/→ once focused)
		to page through Round of 32 → Final. Hover the ticker to pause it.
	</p>

	<PagedKnockoutBracket rounds={mockBracketRounds} initialRound={0} />
</main>

<style>
	/* Hardcoded, not theme tokens — this page stays dark on purpose regardless
	   of what the app's global palette is doing (burgundy again as of this
	   revert). It's a permanent prototype showcase, not themed content; see
	   the matching note on LightBoard's colors prop above. */
	main {
		min-height: 100vh;
		background: #0e1015;
		color: #e7e9ee;
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		padding: 32px 16px 64px;
	}
	h1 {
		max-width: 960px;
		margin: 0 auto 4px;
		font-size: 22px;
	}
	p {
		max-width: 960px;
		margin: 0 auto 24px;
		color: #7a8194;
		font-size: 14px;
	}
</style>
