<script lang="ts">
	import type { Match, MatchParticipant, SetScore } from '$lib/api/types';
	import { cn } from '$lib/utils/cn';

	let { match, href }: { match: Match; href?: string } = $props();

	function slot(n: 1 | 2): MatchParticipant | undefined {
		return match.participants.find((p) => p.slot === n);
	}

	function isWinner(p: MatchParticipant | undefined): boolean {
		return !!p?.participant_id && p.participant_id === match.winner_participant_id;
	}

	/** Games per set for one side, formatted with a tiebreak superscript. */
	function games(set: SetScore, side: 1 | 2): string {
		const g = side === 1 ? set.p1_games : set.p2_games;
		return String(g);
	}
	function tiebreak(set: SetScore, side: 1 | 2): number | null | undefined {
		return side === 1 ? set.p1_tiebreak : set.p2_tiebreak;
	}

	const live = $derived(match.status === 'live');
</script>

{#snippet row(p: MatchParticipant | undefined, side: 1 | 2)}
	<div
		class={cn(
			'flex items-center gap-2 px-3 py-2',
			isWinner(p) ? 'text-primary' : 'text-muted'
		)}
	>
		{#if p?.seed}
			<span class="w-4 shrink-0 text-[10px] text-muted/70">{p.seed}</span>
		{:else}
			<span class="w-4 shrink-0"></span>
		{/if}
		<span class="min-w-0 flex-1 truncate text-sm">
			{p?.display_name ?? 'TBD'}
		</span>
		<!-- Per-set scores -->
		<span class="flex shrink-0 items-center gap-1 tabular-nums">
			{#each match.sets as set (set.set_number)}
				<span class={cn('relative text-sm', isWinner(p) && 'font-semibold text-accent')}>
					{games(set, side)}{#if tiebreak(set, side) != null}<sup
							class="text-[9px] text-muted/70">{tiebreak(set, side)}</sup
						>{/if}
				</span>
			{/each}
		</span>
		{#if isWinner(p)}
			<span class="size-1.5 shrink-0 rounded-full bg-accent"></span>
		{:else}
			<span class="size-1.5 shrink-0"></span>
		{/if}
	</div>
{/snippet}

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class={cn(
		'block w-56 overflow-hidden rounded-lg border bg-surface transition-colors',
		live ? 'border-live/40' : 'border-border',
		href && 'hover:border-accent/50'
	)}
>
	{@render row(slot(1), 1)}
	<div class="h-px bg-border"></div>
	{@render row(slot(2), 2)}

	{#if live}
		<div class="flex items-center gap-1.5 border-t border-border bg-accent/10 px-3 py-1">
			<span class="size-1.5 animate-pulse rounded-full bg-accent"></span>
			<span class="text-[10px] font-medium uppercase tracking-wide text-accent">Live</span>
		</div>
	{/if}
</svelte:element>
