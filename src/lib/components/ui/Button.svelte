<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; size?: Size; children: Snippet } = $props();

	const variants: Record<Variant, string> = {
		primary: 'bg-accent text-white hover:bg-accent-hover',
		secondary: 'bg-surface-elevated text-primary hover:bg-border border border-border',
		ghost: 'text-secondary hover:text-primary hover:bg-surface',
		danger: 'bg-danger text-white hover:opacity-90'
	};
	const sizes: Record<Size, string> = {
		sm: 'h-8 px-3 text-sm',
		md: 'h-10 px-4 text-sm',
		lg: 'h-11 px-6 text-base'
	};
</script>

<button
	class={cn(
		'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
		variants[variant],
		sizes[size],
		className
	)}
	{...rest}
>
	{@render children()}
</button>
