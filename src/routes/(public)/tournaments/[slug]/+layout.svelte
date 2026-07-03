<script lang="ts">
	import type { Snippet } from 'svelte';
	import TournamentHeader from '$lib/components/public/TournamentHeader.svelte';
	import TournamentTabs from '$lib/components/public/TournamentTabs.svelte';
	import type { PublicTournament } from '$lib/api/types';

	let {
		data,
		children
	}: { data: { tournament: PublicTournament }; children: Snippet } = $props();
</script>

<TournamentHeader tournament={data.tournament} />
<TournamentTabs slug={data.tournament.slug} />

<div class="mx-auto max-w-6xl px-4 py-8">
	{@render children()}
</div>
