<script lang="ts">
	import type { BracketMatch, BracketSlot } from '$lib/api/endpoints/events';
	import { cn } from '$lib/utils/cn';

	let {
		match,
		href,
		onclick
	}: { match: BracketMatch; href?: string; onclick?: () => void } = $props();

	const interactive = $derived(!!href || !!onclick);

	function slot(n: number): BracketSlot | undefined {
		return match.participants.find((p) => p.slot === n);
	}
	function isWinner(p: BracketSlot | undefined): boolean {
		return !!p?.participant_id && p.participant_id === match.winner_participant_id;
	}
	function games(n: number): string {
		if (!match.sets?.length) return '';
		return match.sets.map((s) => (n === 1 ? s.p1 : s.p2)).join(' ');
	}
	const live = $derived(match.status === 'live');
	const isBye = $derived(match.status === 'bye');
</script>

{#snippet row(p: BracketSlot | undefined, n: number)}
	<div class="flex items-center gap-2 px-2.5 py-2">
		<span
			class={cn(
				'min-w-0 flex-1 truncate text-[12px]',
				isWinner(p) ? 'font-bold text-accent' : p?.display_name ? 'text-primary' : 'text-muted'
			)}>{p?.display_name ?? p?.source_label ?? (isBye ? 'Bye' : 'TBD')}</span
		>
		<span
			class={cn(
				'shrink-0 font-mono text-[12px] tabular-nums',
				isWinner(p) ? 'text-accent' : 'text-muted'
			)}>{games(n)}</span
		>
		{#if isWinner(p)}
			<span class="size-1.5 shrink-0 rounded-full bg-accent"></span>
		{:else}
			<span class="size-1.5 shrink-0"></span>
		{/if}
	</div>
{/snippet}

<svelte:element
	this={href ? 'a' : onclick ? 'button' : 'div'}
	{href}
	{onclick}
	type={onclick && !href ? 'button' : undefined}
	role={onclick && !href ? 'button' : undefined}
	class={cn(
		'block w-52 overflow-hidden rounded-md border bg-surface text-left shadow-(--shadow-subtle) transition-colors',
		live ? 'border-accent' : 'border-border',
		interactive && 'cursor-pointer hover:border-accent/60'
	)}
>
	<div
		class="flex items-center justify-between bg-subtle px-2.5 py-1 text-[9px] font-mono font-medium uppercase tracking-[0.12em] text-muted"
	>
		<span>Match {match.match_no}</span>
		<span class={cn(isBye && 'text-gold', live && 'text-accent')}>{match.status}</span>
	</div>
	{@render row(slot(1), 1)}
	<div class="h-px bg-border"></div>
	{@render row(slot(2), 2)}
</svelte:element>
