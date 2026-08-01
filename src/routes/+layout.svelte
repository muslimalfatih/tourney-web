<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { navigating } from '$app/state';
	import { Check, TriangleAlert, Info } from '@lucide/svelte';

	let { children } = $props();

	// Any client navigation with a load (SSR data) sets `navigating.to`. Show a
	// top progress bar for its duration so a slow load reads as "working", not
	// "stuck" — the standard SvelteKit pattern. Delayed ~120ms so instant navs
	// (cached loads) never flash the bar.
	let showBar = $state(false);
	$effect(() => {
		if (navigating.to) {
			const t = setTimeout(() => (showBar = true), 120);
			return () => clearTimeout(t); // nav ended before 120ms → never showed
		}
		showBar = false;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Global navigation progress: a slim indeterminate accent bar pinned to the
     top edge while a route loads. Purely a status affordance (Apple §16). -->
{#if showBar}
	<div class="nav-progress" role="status" aria-label="Loading"></div>
{/if}

{@render children()}

<!-- Global toast host, top-right. Restrained: one calm surface for every type,
     a thin line icon (not a filled disc) carrying the only colour. Sizing +
     icon colour in layout.css ([data-sonner-toast][data-type=…]). -->
<Toaster
	position="top-right"
	closeButton
	richColors={false}
	toastOptions={{
		classes: {
			toast:
				'!bg-surface !text-primary !border !border-border !rounded-md !shadow-(--shadow-subtle) !font-body',
			title: '!text-[13px] !font-semibold !tracking-[-0.006em] !leading-tight',
			description: '!text-[12px] !text-muted !leading-snug',
			actionButton: '!bg-accent !text-on-accent !rounded-pill !text-[11px] !font-bold'
		}
	}}
>
	{#snippet successIcon()}<Check size={16} strokeWidth={2.25} />{/snippet}
	{#snippet errorIcon()}<TriangleAlert size={16} strokeWidth={2} />{/snippet}
	{#snippet infoIcon()}<Info size={16} strokeWidth={2} />{/snippet}
</Toaster>
