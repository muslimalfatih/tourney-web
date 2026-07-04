<script lang="ts">
	import type { GroupKnockout, EventBracket } from '$lib/api/endpoints/events';
	import Standings from './Standings.svelte';
	import BurgundyBracket from './BurgundyBracket.svelte';

	let { data, matchHref }: { data: GroupKnockout; matchHref?: (id: string) => string } = $props();

	// Reuse the bracket renderer for the knockout rounds.
	const knockoutBracket = $derived<EventBracket>({
		event_id: data.event_id,
		format: 'single_elim',
		rounds: data.knockout
	});
	const hasKnockout = $derived(data.knockout.some((r) => r.matches.length > 0));
</script>

<div class="space-y-8">
	<section>
		<h3 class="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Group stage</h3>
		<div class="grid gap-4 md:grid-cols-2">
			{#each data.groups as group (group.name)}
				<div>
					<p class="mb-2 font-display text-[14px] uppercase tracking-[0.06em] text-primary">
						{group.name}
					</p>
					<Standings standings={group.standings} />
				</div>
			{/each}
		</div>
	</section>

	{#if hasKnockout}
		<section>
			<h3 class="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Knockout</h3>
			<BurgundyBracket bracket={knockoutBracket} {matchHref} />
		</section>
	{/if}
</div>
