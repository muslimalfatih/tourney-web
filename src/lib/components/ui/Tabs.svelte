<script lang="ts">
	import { Tabs } from 'bits-ui';
	import type { Snippet } from 'svelte';

	// Burgundy tab bar on the Bits UI Tabs primitive (accessible: roving
	// tabindex, arrow-key nav). `value` is bindable; `items` drives the triggers;
	// the parent renders panels via the children snippet keyed on value.
	let {
		value = $bindable(''),
		items,
		children
	}: {
		value?: string;
		items: { value: string; label: string }[];
		children: Snippet;
	} = $props();
</script>

<Tabs.Root bind:value>
	<Tabs.List class="flex gap-1 border-b border-border">
		{#each items as item (item.value)}
			<Tabs.Trigger
				value={item.value}
				class="-mb-px cursor-pointer border-b-2 border-transparent px-4 py-2.5 text-[11px] font-mono font-medium uppercase tracking-[0.12em] text-muted transition-colors data-[state=active]:border-accent data-[state=active]:text-primary hover:text-primary"
			>
				{item.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
	<div class="pt-6">
		{@render children()}
	</div>
</Tabs.Root>
