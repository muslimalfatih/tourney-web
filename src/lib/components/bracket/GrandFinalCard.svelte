<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type FinalSlot = { slot: number; display_name?: string | null; participant_id?: string | null };
	type FinalMatch = {
		participants?: FinalSlot[];
		winner_participant_id?: string | null;
		sets?: { p1: number; p2: number }[];
	} | null;

	let { finalMatch }: { finalMatch?: FinalMatch } = $props();

	function slot(n: number): FinalSlot | undefined {
		return finalMatch?.participants?.find((p) => p.slot === n);
	}
	function isWinner(p: FinalSlot | undefined): boolean {
		return !!p?.participant_id && p.participant_id === finalMatch?.winner_participant_id;
	}
	function games(n: number): string {
		if (!finalMatch?.sets?.length) return '';
		return finalMatch.sets.map((s) => (n === 1 ? s.p1 : s.p2)).join(' ');
	}
</script>

{#snippet side(p: FinalSlot | undefined, n: number)}
	<div class="flex flex-1 flex-col items-center gap-1 text-center">
		<span
			class={cn(
				'font-display text-lg leading-tight',
				isWinner(p) ? 'font-bold text-accent' : p?.display_name ? 'text-primary' : 'text-muted'
			)}>{p?.display_name ?? 'TBD'}</span
		>
		{#if games(n)}
			<span
				class={cn(
					'font-mono text-sm tabular-nums',
					isWinner(p) ? 'text-accent' : 'text-muted'
				)}>{games(n)}</span
			>
		{/if}
	</div>
{/snippet}

<div
	class="mx-auto max-w-md rounded-lg border border-gold bg-gradient-to-b from-[color-mix(in_srgb,var(--color-gold)_16%,var(--color-surface))] to-surface p-6 text-center shadow-(--shadow-soft)"
>
	<span
		class="inline-flex items-center gap-1 rounded-pill border border-gold bg-[color-mix(in_srgb,var(--color-gold)_18%,var(--color-surface))] px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-gold)_55%,var(--color-primary))]"
	>
		Champion
	</span>

	<div class="mt-5 flex items-center justify-center gap-3">
		{@render side(slot(1), 1)}
		<span
			class="shrink-0 rounded-pill border border-gold bg-surface px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-gold"
			>VS</span
		>
		{@render side(slot(2), 2)}
	</div>
</div>
