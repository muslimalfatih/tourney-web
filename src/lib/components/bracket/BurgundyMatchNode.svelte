<script lang="ts">
	import type { BracketMatch, BracketSlot } from '$lib/api/endpoints/events';
	import { cn } from '$lib/utils/cn';

	let { match, href }: { match: BracketMatch; href?: string } = $props();

	function slot(n: number): BracketSlot | undefined {
		return match.participants.find((p) => p.slot === n);
	}
	const live = $derived(match.status === 'live');
	const isBye = $derived(match.status === 'bye');
</script>

{#snippet row(p: BracketSlot | undefined)}
	<div class="flex items-center gap-2 px-2.5 py-2">
		{#if p?.seed != null}
			<span
				class="inline-grid size-[18px] shrink-0 place-items-center rounded-full border border-gold font-display text-[10px] text-gold"
				>{p.seed}</span
			>
		{:else}
			<span class="w-[18px] shrink-0"></span>
		{/if}
		<span
			class={cn(
				'min-w-0 flex-1 truncate text-[12px]',
				p?.display_name ? 'text-primary' : 'text-muted'
			)}>{p?.display_name ?? (isBye ? 'Bye' : 'TBD')}</span
		>
	</div>
{/snippet}

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class={cn(
		'block w-52 overflow-hidden rounded-md border bg-surface shadow-(--shadow-subtle) transition-colors',
		live ? 'border-accent' : 'border-border',
		href && 'hover:border-accent/60'
	)}
>
	<div
		class="flex items-center justify-between bg-subtle px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
	>
		<span>Match {match.match_no}</span>
		<span class={cn(isBye && 'text-gold', live && 'text-accent')}>{match.status}</span>
	</div>
	{@render row(slot(1))}
	<div class="h-px bg-border"></div>
	{@render row(slot(2))}
</svelte:element>
