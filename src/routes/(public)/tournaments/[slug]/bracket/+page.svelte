<script lang="ts">
	import type { PublicTournament, Bracket as BracketData } from '$lib/api/types';
	import Bracket from '$lib/components/bracket/Bracket.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { sampleBracket } from '$lib/components/bracket/sample';
	import { LiveConnection } from '$lib/stores/live.svelte';

	let {
		data
	}: { data: { tournament: PublicTournament; bracket: BracketData | null } } = $props();

	// Until the draw endpoint returns real data, show the sample so the custom
	// renderer is visible. When bracket is non-null and has rounds, use it.
	const bracket = $derived(
		data.bracket && data.bracket.rounds.length > 0 ? data.bracket : sampleBracket
	);
	const usingSample = $derived(bracket === sampleBracket);

	// Live updates over SSE. The slug is stable for the lifetime of this page
	// (navigating to another tournament remounts), so a per-mount connection is
	// correct. Constructing inside the effect keeps the reactive graph honest.
	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const conn = new LiveConnection(data.tournament.slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});

	const matchHref = (id: string) => `/tournaments/${data.tournament.slug}/matches/${id}`;
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-lg font-semibold text-primary">Bracket</h2>
	{#if live?.connected}
		<Badge tone="accent">
			<span class="size-1.5 animate-pulse rounded-full bg-accent"></span>
			Live
		</Badge>
	{/if}
</div>

{#if usingSample}
	<p class="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
		Showing sample data — the real draw appears here once generated.
	</p>
{/if}

<Bracket {bracket} {matchHref} />
