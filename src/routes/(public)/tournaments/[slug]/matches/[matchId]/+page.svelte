<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MatchCard from '$lib/components/bracket/MatchCard.svelte';
	import { sampleBracket } from '$lib/components/bracket/sample';
	import { page } from '$app/state';

	let { data }: { data: { tournament: PublicTournament } } = $props();

	// Skeleton: look the match up in the sample bracket. Once the match endpoint
	// returns real data this becomes a +page.server.ts load calling getPublicMatch.
	const matchId = $derived(page.params.matchId);
	const match = $derived(
		sampleBracket.rounds.flatMap((r) => r.matches).find((m) => m.id === matchId)
	);
</script>

<a href="/tournaments/{data.tournament.slug}/bracket" class="text-sm text-muted hover:text-primary"
	>← Back to bracket</a
>

<h2 class="mb-4 mt-3 text-lg font-semibold text-primary">Match</h2>

{#if match}
	<div class="max-w-md space-y-4">
		<div class="flex items-center gap-2">
			<Badge tone={match.status === 'live' ? 'accent' : 'neutral'}>{match.status}</Badge>
		</div>
		<MatchCard {match} />
	</div>
{:else}
	<Card>
		<p class="text-sm text-muted">Match not found.</p>
	</Card>
{/if}
