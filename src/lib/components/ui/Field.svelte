<script lang="ts">
	import type { Snippet } from 'svelte';

	// Labelled form field wrapper — uppercase tracked label + slot for the
	// control. Keeps every form on the same spacing and type.
	let {
		label,
		hint = '',
		id,
		children
	}: { label: string; hint?: string; id?: string; children: Snippet } = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{label}</label>
	{@render children()}
	{#if hint}<p class="text-[11px] text-muted">{hint}</p>{/if}
</div>
