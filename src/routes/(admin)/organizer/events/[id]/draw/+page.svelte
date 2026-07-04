<script lang="ts">
	import type { EventRow, EventBracket, Standing } from '$lib/api/endpoints/events';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import Standings from '$lib/components/bracket/Standings.svelte';

	let {
		data
	}: {
		data: { event: EventRow; bracket: EventBracket | null; standings: Standing[] | null };
	} = $props();

	const isRoundRobin = $derived(data.event.format === 'round_robin');
</script>

<div class="mb-6">
	<a
		href="/organizer/events/{data.event.id}"
		class="text-sm text-muted transition-colors hover:text-primary">← Event</a
	>
	<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">
		{data.event.name} — {isRoundRobin ? 'Standings' : 'Draw'}
	</h1>
	<p class="text-xs capitalize text-muted">
		{data.event.discipline} · {isRoundRobin ? 'round robin' : 'single elimination'}
	</p>
</div>

{#if isRoundRobin}
	<Standings standings={data.standings ?? []} />
{:else if data.bracket}
	<BurgundyBracket bracket={data.bracket} />
{/if}
