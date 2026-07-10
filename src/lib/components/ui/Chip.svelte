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
</script>

<button
	class={cn(
		'rounded-pill border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] leading-none transition-[color,background-color,border-color,transform] duration-100 ease-out active:scale-[0.96] motion-reduce:active:scale-100',
		active
			? 'border-accent bg-accent text-on-accent'
			: 'border-accent-soft bg-subtle text-primary hover:border-accent',
		className
	)}
	{...rest}
>
	{@render children()}
</button>
