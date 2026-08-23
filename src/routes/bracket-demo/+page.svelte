<script lang="ts">
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import LightBoard from '$lib/components/ui/LightBoard.svelte';
	import { mockBracketRounds } from '$lib/data/mock-bracket';
</script>

<svelte:head>
	<title>Paged Knockout Bracket — Demo</title>
</svelte:head>

<main>
	<!-- LightBoard and the bracket both default to the app's --color-* tokens,
	     so this showcase tracks the live theme with no overrides. -->
	<LightBoard
		text="32 teams - single elimination - round of 32 to final"
		rows={9}
		class="mx-auto mb-8 max-w-240"
	/>

	<h1>Paged Knockout Bracket</h1>
	<p>
		32-team single elimination. Shows 3 rounds at a time — use the arrows (or ←/→ once focused)
		to page through Round of 32 → Final. Hover the ticker to pause it.
	</p>

	<PagedKnockoutBracket rounds={mockBracketRounds} initialRound={0} />
</main>

<style>
	main {
		min-height: 100vh;
		background: var(--color-page);
		color: var(--color-primary);
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
		color: var(--color-muted);
		font-size: 14px;
	}
</style>
