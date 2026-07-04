<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import type { EventBracket } from '$lib/api/endpoints/events';
	import { getEventBracket } from '$lib/api/endpoints/events';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { LiveConnection } from '$lib/stores/live.svelte';

	let {
		data
	}: {
		data: { tournament: PublicTournament; bracket: EventBracket | null; eventId: string | null };
	} = $props();

	// Local bracket state, refreshed on live updates. Seeded from SSR data and
	// re-synced whenever the navigation data changes.
	let liveBracket = $state<EventBracket | null>(null);
	const bracket = $derived(liveBracket ?? data.bracket);

	// Live: subscribe to the tournament stream. On any match event, re-fetch the
	// current event's bracket so scores + advancement appear without a reload.
	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const slug = data.tournament.slug;
		const eventId = data.eventId;
		const conn = new LiveConnection(slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});

	// React to the latest live event by refetching the current event's bracket.
	$effect(() => {
		const ev = live?.lastEvent;
		const eventId = data.eventId;
		if (ev && eventId) {
			getEventBracket(eventId)
				.then((b) => (liveBracket = b))
				.catch(() => {});
		}
	});

	const matchHref = (id: string) => `/tournaments/${data.tournament.slug}/matches/${id}`;
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="font-display text-lg uppercase tracking-[0.06em] text-primary">Bracket</h2>
	{#if live?.connected}
		<Tag tone="gold">
			<span class="size-1.5 animate-pulse rounded-full bg-gold"></span>
			Live
		</Tag>
	{/if}
</div>

{#if bracket}
	<BurgundyBracket {bracket} {matchHref} />
{:else}
	<EmptyState
		title="Draw not published yet"
		message="The bracket will appear here once the organizer generates and publishes the draw."
	/>
{/if}
