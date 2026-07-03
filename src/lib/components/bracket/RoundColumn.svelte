<script lang="ts">
	import type { BracketRound } from '$lib/api/types';
	import MatchCard from './MatchCard.svelte';

	let {
		round,
		matchHref
	}: {
		round: BracketRound;
		/** Optional builder for a per-match link (match detail page). */
		matchHref?: (matchId: string) => string;
	} = $props();
</script>

<div class="flex min-w-56 flex-col">
	<div class="mb-3 px-1">
		<h3 class="text-sm font-semibold text-primary">{round.name}</h3>
		<p class="text-xs text-secondary">{round.matches.length} match{round.matches.length === 1 ? '' : 'es'}</p>
	</div>

	<!--
		Matches are spread evenly down the column. The gap grows each round so
		cards line up with the midpoint of their two feeders — a simple, robust
		layout that avoids absolute positioning while reading as a bracket.
	-->
	<div class="flex flex-1 flex-col justify-around gap-6">
		{#each round.matches as match (match.id)}
			<MatchCard {match} href={matchHref?.(match.id)} />
		{/each}
	</div>
</div>
