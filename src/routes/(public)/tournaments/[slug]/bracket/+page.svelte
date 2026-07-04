<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import type { EventBracket, Standing } from '$lib/api/endpoints/events';
	import { getEventBracket, getEventStandings } from '$lib/api/endpoints/events';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { LiveConnection } from '$lib/stores/live.svelte';

	let {
		data
	}: {
		data: {
			tournament: PublicTournament;
			bracket: EventBracket | null;
			standings: Standing[] | null;
			eventId: string | null;
			isRoundRobin: boolean;
		};
	} = $props();

	let liveBracket = $state<EventBracket | null>(null);
	let liveStandings = $state<Standing[] | null>(null);
	const bracket = $derived(liveBracket ?? data.bracket);
	const standings = $derived(liveStandings ?? data.standings);

	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const slug = data.tournament.slug;
		const conn = new LiveConnection(slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});
	// Re-fetch the appropriate view on any live match event.
	$effect(() => {
		const ev = live?.lastEvent;
		const eventId = data.eventId;
		const rr = data.isRoundRobin;
		if (ev && eventId) {
			if (rr) {
				getEventStandings(eventId).then((s) => (liveStandings = s.standings)).catch(() => {});
			} else {
				getEventBracket(eventId).then((b) => (liveBracket = b)).catch(() => {});
			}
		}
	});

	const matchHref = (id: string) => `/tournaments/${data.tournament.slug}/matches/${id}`;
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="font-display text-lg uppercase tracking-[0.06em] text-primary">
		{data.isRoundRobin ? 'Standings' : 'Bracket'}
	</h2>
	{#if live?.connected}
		<Tag tone="gold">
			<span class="size-1.5 animate-pulse rounded-full bg-gold"></span>
			Live
		</Tag>
	{/if}
</div>

{#if data.isRoundRobin}
	<Standings standings={standings ?? []} />
{:else if bracket}
	<BurgundyBracket {bracket} {matchHref} />
{:else}
	<EmptyState
		title="Draw not published yet"
		message="The bracket will appear here once the organizer generates and publishes the draw."
	/>
{/if}
