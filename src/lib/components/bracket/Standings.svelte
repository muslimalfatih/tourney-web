<script lang="ts">
	import type { Standing } from '$lib/api/endpoints/events';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { standings }: { standings: Standing[] } = $props();
	const diff = (s: Standing) => s.sets_for - s.sets_against;
</script>

{#if standings.length === 0}
	<EmptyState title="No standings yet" message="Standings appear once the round-robin draw is generated." />
{:else}
	<Card padded={false}>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[420px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						<th class="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">#</th>
						<th class="px-4 py-2.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">Team</th>
						{#each ['P', 'W', 'L', 'Sets', 'Diff'] as h, hi (hi)}
							<th class="px-3 py-2.5 text-center text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each standings as s, i (s.participant_id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-4 py-2.5 font-display text-muted">{i + 1}</td>
							<td class="px-4 py-2.5 font-bold text-primary">{s.display_name}</td>
							<td class="px-3 py-2.5 text-center tabular-nums text-muted">{s.played}</td>
							<td class="px-3 py-2.5 text-center tabular-nums font-bold text-accent">{s.won}</td>
							<td class="px-3 py-2.5 text-center tabular-nums text-muted">{s.lost}</td>
							<td class="px-3 py-2.5 text-center tabular-nums text-muted">{s.sets_for}–{s.sets_against}</td>
							<td class="px-3 py-2.5 text-center tabular-nums text-primary">{diff(s) > 0 ? '+' : ''}{diff(s)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}
