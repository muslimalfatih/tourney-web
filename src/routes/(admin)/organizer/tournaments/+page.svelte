<script lang="ts">
	import type { Tournament } from '$lib/api/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { Plus } from '@lucide/svelte';

	let { data }: { data: { tournaments: Tournament[] } } = $props();
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-xl font-semibold text-primary">Tournaments</h1>
	<a href="/organizer/tournaments/new">
		<Button><Plus class="size-4" /> New</Button>
	</a>
</div>

{#if data.tournaments.length === 0}
	<EmptyState title="No tournaments yet" message="Create your first tournament to get started.">
		{#snippet action()}
			<a href="/organizer/tournaments/new"><Button>Create tournament</Button></a>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-3">
		{#each data.tournaments as t (t.id)}
			<a href="/organizer/tournaments/{t.id}">
				<Card class="flex items-center justify-between transition-colors hover:border-accent/50">
					<div>
						<p class="font-medium text-primary">{t.name}</p>
						<p class="text-xs text-secondary">/{t.slug}</p>
					</div>
					<Badge tone={t.status === 'published' ? 'accent' : 'neutral'}>{t.status}</Badge>
				</Card>
			</a>
		{/each}
	</div>
{/if}
