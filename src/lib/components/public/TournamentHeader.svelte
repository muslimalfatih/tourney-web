<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { MapPin } from '@lucide/svelte';

	let { tournament }: { tournament: PublicTournament } = $props();

	// White-label hook: a tournament can carry a display title / accent in its
	// branding JSON. Fall back to platform defaults. Never hardcode a brand.
	const title = $derived(
		(tournament.branding?.title as string | undefined) ?? tournament.name
	);
	const location = $derived(
		(tournament.branding?.location as string | undefined) ?? tournament.location ?? undefined
	);
</script>

<header class="border-b border-border bg-surface">
	<div class="mx-auto max-w-6xl px-4 py-8">
		<div class="flex flex-wrap items-center gap-3">
			<Badge tone="gold">{tournament.sport}</Badge>
			{#if tournament.status === 'published'}
				<Badge tone="accent">Live event</Badge>
			{/if}
		</div>
		<h1
			class="mt-3 font-display text-3xl uppercase tracking-[0.08em] text-primary sm:text-4xl"
		>
			{title}
		</h1>
		{#if location}
			<p class="mt-2 flex items-center gap-1.5 text-sm text-muted">
				<MapPin class="size-4" />
				{location}
			</p>
		{/if}
	</div>
</header>
