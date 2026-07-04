<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		class: className = '',
		key = false,
		padded = true,
		children
	}: { class?: string; key?: boolean; padded?: boolean; children: Snippet } = $props();
</script>

<div
	class={cn(
		'rounded-lg border border-border bg-surface',
		key ? 'shadow-(--shadow-soft)' : 'shadow-(--shadow-subtle)',
		padded && 'p-5',
		className
	)}
>
	{@render children()}
</div>
