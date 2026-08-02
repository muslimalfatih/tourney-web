<script lang="ts">
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import { mockBracketRounds } from '$lib/data/mock-bracket';
</script>

<svelte:head>
	<title>Paged Knockout Bracket — Demo</title>
</svelte:head>

<main>
	<h1>Paged Knockout Bracket</h1>
	<p>
		32-team single elimination. Shows 3 rounds at a time — use the arrows (or ←/→ once focused)
		to page through Round of 32 → Final.
	</p>

	<PagedKnockoutBracket rounds={mockBracketRounds} initialRound={0} />
</main>

<style>
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
