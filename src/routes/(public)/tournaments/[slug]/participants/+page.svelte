<script lang="ts">
	import type { EventDivision } from '$lib/api/types';
	import type { Participant } from '$lib/api/endpoints/participants';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let {
		data
	}: { data: { rosters: { event: EventDivision; participants: Participant[] }[] } } = $props();

	const hasAny = $derived(data.rosters.some((r) => r.participants.length > 0));
	const nounFor = (e: EventDivision) => (e.discipline === 'doubles' ? 'Teams' : 'Players');
</script>

<h2 class="mb-4 font-display text-lg uppercase tracking-[0.06em] text-primary">Participants</h2>

{#if !hasAny}
	<EmptyState
		title="No participants listed yet"
		message="Registered players and teams will appear here once the organizer adds them."
	/>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each data.rosters as roster (roster.event.id)}
			{#if roster.participants.length > 0}
				<Card padded={false}>
					<div class="flex items-center justify-between border-b border-border px-5 py-3">
						<div>
							<h3 class="font-display text-[15px] uppercase tracking-[0.06em] text-primary">
								{roster.event.name}
							</h3>
							<p class="text-[11px] capitalize text-muted">
								{roster.event.discipline} · {nounFor(roster.event)}
							</p>
						</div>
						<span class="font-display text-lg tabular-nums text-accent"
							>{roster.participants.length}</span
						>
					</div>
					<ul class="divide-y divide-border">
						{#each roster.participants as p (p.id)}
							<li class="flex items-center gap-3 px-5 py-2.5">
								{#if p.seed != null}
									<span
										class="inline-grid size-6 shrink-0 place-items-center rounded-full border border-gold font-display text-[11px] text-gold"
										>{p.seed}</span
									>
								{:else}
									<span class="w-6 shrink-0 text-center text-muted">·</span>
								{/if}
								<span class="text-[13px] text-primary">{p.display_name}</span>
							</li>
						{/each}
					</ul>
				</Card>
			{/if}
		{/each}
	</div>
{/if}
