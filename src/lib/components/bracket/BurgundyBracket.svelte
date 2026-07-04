<script lang="ts">
	import type { EventBracket } from '$lib/api/endpoints/events';
	import BurgundyMatchNode from './BurgundyMatchNode.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let {
		bracket,
		matchHref
	}: { bracket: EventBracket; matchHref?: (id: string) => string } = $props();

	// Zoom via a CSS scale on the bracket surface. Pan is native horizontal
	// scroll. This is a DOM/CSS bracket — full control over the Burgundy look,
	// no third-party widget.
	let zoom = $state(1);
	const hasRounds = $derived(bracket.rounds.some((r) => r.matches.length > 0));
</script>

{#if hasRounds}
	<div class="mb-4 flex items-center gap-2">
		<div class="inline-flex items-center overflow-hidden rounded-pill border border-border">
			<button
				class="grid size-8 place-items-center text-lg text-primary hover:bg-subtle"
				aria-label="Zoom out"
				onclick={() => (zoom = Math.max(0.6, zoom - 0.1))}>−</button
			>
			<span class="px-2 text-[11px] tabular-nums text-muted">{Math.round(zoom * 100)}%</span>
			<button
				class="grid size-8 place-items-center text-lg text-primary hover:bg-subtle"
				aria-label="Zoom in"
				onclick={() => (zoom = Math.min(1.4, zoom + 0.1))}>+</button
			>
		</div>
	</div>

	<div class="bracket-scroll overflow-x-auto pb-4">
		<div
			class="flex min-h-[24rem] origin-top-left gap-10 px-1"
			style="transform: scale({zoom}); width: {100 / zoom}%"
		>
			{#each bracket.rounds as round (round.round_number)}
				<div class="flex min-w-[13rem] flex-col">
					<div class="mb-3 px-1">
						<h3 class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{round.name}</h3>
						<p class="text-[11px] text-muted">
							{round.matches.length} match{round.matches.length === 1 ? '' : 'es'}
						</p>
					</div>
					<div class="flex flex-1 flex-col justify-around gap-6">
						{#each round.matches as m (m.id)}
							<BurgundyMatchNode match={m} href={matchHref?.(m.id)} />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<EmptyState
		title="Draw not yet generated"
		message="Confirm participants and seeding on the event page, then generate the bracket."
	/>
{/if}
