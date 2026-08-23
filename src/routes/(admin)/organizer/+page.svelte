<script lang="ts">
	import type { Tournament } from '$lib/api/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { Plus } from '@lucide/svelte';

	let {
		data
	}: {
		data: {
			stats: { tournaments: number; published: number; events: number };
			recent: Tournament[];
		};
	} = $props();

	const tagTone = (s: string) => (s === 'published' ? 'published' : s === 'archived' ? 'archived' : 'draft');
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-display text-3xl tracking-[-0.01em] text-primary">Overview</h1>
		<p class="text-xs text-muted">Your tournaments and events at a glance.</p>
	</div>
	<a href="/organizer/tournaments/new">
		<Button><Plus class="size-4" /> New tournament</Button>
	</a>
</div>

<!-- Stat tiles -->
<div class="mb-8 grid gap-4 sm:grid-cols-3">
	{#each [{ l: 'Tournaments', n: data.stats.tournaments }, { l: 'Published', n: data.stats.published }, { l: 'Events', n: data.stats.events }] as s (s.l)}
		<Card>
			<p class="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">{s.l}</p>
			<p class="mt-1 font-display text-3xl text-accent tabular-nums">{s.n}</p>
		</Card>
	{/each}
</div>

<!-- Recent tournaments -->
<h2 class="mb-3 font-display text-[17px] tracking-[-0.01em] text-primary">Recent</h2>
{#if data.recent.length === 0}
	<EmptyState title="No tournaments yet" message="Create your first tournament to get started.">
		{#snippet action()}
			<a href="/organizer/tournaments/new"><Button>Create tournament</Button></a>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-2">
		{#each data.recent as t (t.id)}
			<a href="/organizer/tournaments/{t.id}">
				<Card class="flex items-center justify-between transition-colors hover:border-accent/50">
					<div>
						<p class="font-bold text-primary">{t.name}</p>
						<p class="text-xs text-muted">{t.event_count ?? 0} events · /{t.slug}</p>
					</div>
					<Tag tone={tagTone(t.status)}>{t.status}</Tag>
				</Card>
			</a>
		{/each}
	</div>
{/if}
