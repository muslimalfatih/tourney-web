<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import BrandIcon from '$lib/components/ui/BrandIcon.svelte';
	let { children }: { children: Snippet } = $props();

	// The homepage hero is full-bleed — no header band above it. Every other
	// public page keeps the brand bar for orientation and the way back home.
	const isHome = $derived(page.url.pathname === '/');
</script>

<div class="flex min-h-screen flex-col bg-page">
	{#if !isHome}
	<div
		class="sticky top-0 z-30 bg-page/80 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0px))]:bg-page"
	>
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
			<a href="/" class="flex items-center gap-2 font-display italic text-[19px] tracking-[-0.01em] text-primary">
				<BrandIcon class="size-5 text-accent" />
				tourney.social
			</a>
		</div>
	</div>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

</div>
