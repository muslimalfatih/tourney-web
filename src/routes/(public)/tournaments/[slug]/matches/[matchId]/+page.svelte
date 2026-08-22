<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import type { MatchDetail, MatchSlot } from '$lib/api/endpoints/matches';
	import { getMatch } from '$lib/api/endpoints/matches';
	import Card from '$lib/components/ui/Card.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { LiveConnection } from '$lib/stores/live.svelte';
	import { cn } from '$lib/utils/cn';

	let { data }: { data: { tournament: PublicTournament; match: MatchDetail } } = $props();

	// Live refresh: subscribe to the tournament stream; on a matching event,
	// re-fetch this match so the public score updates in place.
	let liveMatch = $state<MatchDetail | null>(null);
	const match = $derived(liveMatch ?? data.match);

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
		const id = data.match.id;
		if (ev && id) {
			getMatch(id)
				.then((m) => (liveMatch = m))
				.catch(() => {});
		}
	});

	function slot(n: number): MatchSlot | undefined {
		return match.participants?.find((p) => p.slot === n);
	}
	function isWinner(n: number): boolean {
		const s = slot(n);
		return !!s?.participant_id && s.participant_id === match.winner_participant_id;
	}
	const tone = (s: string) =>
		s === 'completed' ? 'published' : s === 'live' ? 'gold' : 'draft';
</script>

<a
	href="/tournaments/{data.tournament.slug}/bracket"
	class="text-sm text-muted transition-colors hover:text-primary">← Back to bracket</a
>

<div class="mb-4 mt-3 flex items-center gap-3">
	<h2 class="font-display text-lg uppercase tracking-[0.06em] text-primary">Match {match.match_no}</h2>
	<Tag tone={tone(match.status)}>{match.status}</Tag>
	{#if live?.connected && match.status === 'live'}
		<span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
			<span class="size-1.5 animate-pulse rounded-full bg-gold"></span> Live
		</span>
	{/if}
</div>

<Card padded={false} class="max-w-md">
	{#each [1, 2] as n (n)}
		<div class="flex items-center gap-3 px-5 py-4 {n === 2 ? 'border-t border-border' : ''}">
			<span
				class={cn(
					'flex-1 text-[15px]',
					isWinner(n) ? 'font-bold text-accent' : 'text-primary'
				)}>{slot(n)?.display_name ?? 'TBD'}</span
			>
			<span class="flex shrink-0 items-center gap-2 font-display text-[15px] tabular-nums">
				{#each match.sets ?? [] as s (s.set_number)}
					<span class={isWinner(n) ? 'text-accent' : 'text-muted'}>
						{n === 1 ? s.games_a : s.games_b}
					</span>
				{/each}
			</span>
		</div>
	{/each}
</Card>
