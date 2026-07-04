<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import type { EventBracket, Standing, GroupKnockout } from '$lib/api/endpoints/events';
	import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import GroupKnockoutView from '$lib/components/bracket/GroupKnockoutView.svelte';
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
			groupKnockout: GroupKnockout | null;
			eventId: string | null;
			format: string;
		};
	} = $props();

	let liveBracket = $state<EventBracket | null>(null);
	let liveStandings = $state<Standing[] | null>(null);
	let liveGK = $state<GroupKnockout | null>(null);
	const bracket = $derived(liveBracket ?? data.bracket);
	const standings = $derived(liveStandings ?? data.standings);
	const groupKnockout = $derived(liveGK ?? data.groupKnockout);

	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const slug = data.tournament.slug;
		const conn = new LiveConnection(slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});
	$effect(() => {
		const ev = live?.lastEvent;
		const eventId = data.eventId;
		const fmt = data.format;
		if (!ev || !eventId) return;
		if (fmt === 'round_robin') {
			getEventStandings(eventId).then((s) => (liveStandings = s.standings)).catch(() => {});
		} else if (fmt === 'group_knockout') {
			getGroupKnockout(eventId).then((g) => (liveGK = g)).catch(() => {});
		} else {
			getEventBracket(eventId).then((b) => (liveBracket = b)).catch(() => {});
		}
	});

	const matchHref = (id: string) => `/tournaments/${data.tournament.slug}/matches/${id}`;
	const heading = $derived(
		data.format === 'round_robin'
			? 'Standings'
			: data.format === 'group_knockout'
				? 'Groups & Knockout'
				: 'Bracket'
	);
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="font-display text-lg uppercase tracking-[0.06em] text-primary">{heading}</h2>
	{#if live?.connected}
		<Tag tone="gold">
			<span class="size-1.5 animate-pulse rounded-full bg-gold"></span>
			Live
		</Tag>
	{/if}
</div>

{#if data.format === 'group_knockout' && groupKnockout}
	<GroupKnockoutView data={groupKnockout} {matchHref} />
{:else if data.format === 'round_robin'}
	<Standings standings={standings ?? []} />
{:else if bracket}
	<BurgundyBracket {bracket} {matchHref} />
{:else}
	<EmptyState
		title="Draw not published yet"
		message="The bracket will appear here once the organizer generates and publishes the draw."
	/>
{/if}
