<script lang="ts">
	import type { Bracket } from '$lib/api/types';
	import RoundColumn from './RoundColumn.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let {
		bracket,
		matchHref
	}: {
		bracket: Bracket;
		matchHref?: (matchId: string) => string;
	} = $props();

	const hasRounds = $derived(bracket.rounds.length > 0);
</script>

{#if hasRounds}
	<!--
		Custom horizontal bracket renderer. Rounds are columns; connector spacing
		is handled by RoundColumn's even vertical distribution. The whole area
		scrolls horizontally on desktop and remains usable on mobile (columns keep
		their width and the user scrolls sideways). This is intentionally a
		DOM/CSS layout — no third-party bracket widget — so branding, tennis score
		formatting, and future padel support stay fully under our control.
	-->
	<div class="bracket-scroll overflow-x-auto pb-4">
		<div class="flex min-h-[24rem] gap-10 px-1">
			{#each bracket.rounds as round (round.round_number)}
				<RoundColumn {round} {matchHref} />
			{/each}
		</div>
	</div>
{:else}
	<EmptyState
		title="Draw not generated yet"
		message="The bracket will appear here once the organizer generates the draw."
	/>
{/if}
