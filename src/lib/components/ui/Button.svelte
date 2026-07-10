<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; size?: Size; children: Snippet } = $props();

	// Burgundy button system — pill radius, uppercase tracked labels.
	const variants: Record<Variant, string> = {
		primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-(--shadow-subtle)',
		ghost: 'bg-transparent text-primary border border-accent hover:bg-subtle',
		subtle: 'bg-surface text-primary border border-border hover:bg-subtle',
		danger: 'bg-danger text-on-accent hover:opacity-90'
	};
	const sizes: Record<Size, string> = {
		sm: 'h-8 px-3 text-[11px]',
		md: 'h-10 px-4 text-[11px]',
		lg: 'h-11 px-6 text-xs'
	};
</script>

<button
	class={cn(
		'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill font-bold uppercase tracking-[0.14em] leading-none transition-[color,background-color,box-shadow,transform] duration-100 ease-out active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
		variants[variant],
		sizes[size],
		className
	)}
	{...rest}
>
	{@render children()}
</button>
