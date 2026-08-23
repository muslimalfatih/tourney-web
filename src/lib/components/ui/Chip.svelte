<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	let {
		active = false,
		class: className = '',
		children,
		...rest
	}: HTMLButtonAttributes & { active?: boolean; children: Snippet } = $props();

	// Selected, not primary — same reasoning as SegmentedControl's thumb, and
	// deliberately the same treatment, so the two kinds of filter control that
	// sit side by side in a bar don't read as different kinds of thing.
	const state = $derived(
		active
			? 'border-border bg-subtle text-primary'
			: 'border-border bg-page text-muted hover:border-accent hover:text-primary'
	);
</script>

<button
	class={cn(
		'cursor-pointer rounded-pill border px-4 py-1.5 text-[11px] font-mono font-medium uppercase tracking-widest leading-none transition-[color,background-color,border-color,transform] duration-100 ease-out active:scale-[0.96] motion-reduce:active:scale-100',
		state,
		className
	)}
	{...rest}
>
	{@render children()}
</button>
