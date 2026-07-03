<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let {
		class: className = '',
		children
	}: { class?: string; children: Snippet } = $props();
</script>

<div
	class={cn(
		'rounded-[--radius-card] border border-border bg-surface p-5 shadow-sm',
		className
	)}
>
	{@render children()}
</div>
