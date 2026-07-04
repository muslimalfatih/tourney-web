<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data }: { data: { tournament: PublicTournament } } = $props();
	const events = $derived(data.tournament.events ?? []);

	const formatLabel: Record<string, string> = {
		single_elim: 'Single elimination',
		round_robin: 'Round robin',
		group_knockout: 'Group → knockout'
	};
</script>

<div class="grid gap-6 lg:grid-cols-3">
	<div class="lg:col-span-2">
		<h2 class="mb-4 text-lg font-semibold text-primary">Divisions</h2>
		{#if events.length === 0}
			<EmptyState title="No divisions yet" message="Check back soon." />
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each events as event (event.id)}
					<a href="/tournaments/{data.tournament.slug}/bracket?event={event.id}">
						<Card class="transition-colors hover:border-accent/50">
							<div class="flex items-start justify-between gap-2">
								<span class="font-medium text-primary">{event.name}</span>
								<Badge tone="neutral">{event.discipline}</Badge>
							</div>
							<p class="mt-2 text-xs text-muted">
								{formatLabel[event.format] ?? event.format}
							</p>
						</Card>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<aside>
		<h2 class="mb-4 text-lg font-semibold text-primary">About</h2>
		<Card>
			<dl class="space-y-3 text-sm">
				<div class="flex justify-between">
					<dt class="text-muted">Sport</dt>
					<dd class="capitalize text-primary">{data.tournament.sport}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-muted">Status</dt>
					<dd class="text-primary capitalize">{data.tournament.status}</dd>
				</div>
			</dl>
		</Card>
	</aside>
</div>
