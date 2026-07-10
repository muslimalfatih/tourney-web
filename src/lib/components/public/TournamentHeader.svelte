<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { MapPin } from '@lucide/svelte';

	let {
		tournament,
		activeLabel
	}: { tournament: PublicTournament; activeLabel?: string } = $props();

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
	<div class="mx-auto max-w-6xl px-4 py-14 sm:py-20">
		<div class="flex flex-wrap items-center gap-3">
			<Badge tone="gold">{tournament.sport}</Badge>
			{#if tournament.status === 'published'}
				<Badge tone="accent">Live event</Badge>
			{/if}
		</div>

		<h1
			class="mt-5 font-display uppercase tracking-[-0.02em] text-primary text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]"
		>
			{title}
		</h1>

		{#if activeLabel}
			<p class="mt-3 font-display text-2xl uppercase tracking-tight text-accent sm:text-3xl">
				{activeLabel}
			</p>
		{/if}

		{#if tournament.description}
			<p class="mt-5 max-w-prose text-base text-muted leading-relaxed">
				{tournament.description}
			</p>
		{/if}

		{#if location}
			<p class="mt-6 flex items-center gap-1.5 text-sm text-muted">
				<MapPin class="size-4" />
				{location}
			</p>
		{/if}
	</div>
</header>
