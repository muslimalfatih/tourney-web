<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { Check, TriangleAlert, Info } from '@lucide/svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
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
