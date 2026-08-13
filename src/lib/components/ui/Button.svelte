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

	// Pill radius, uppercase tracked labels.
	//
	// ACCENT BUDGET — the rule the whole UI follows:
	//   filled accent = the ONE primary action in a region (and "you are here" nav)
	//   accent tint   = semantic status (Tag, Badge)
	//   neutral       = selections and secondary actions; accent only on hover
	//
	// `ghost` used to carry border-accent, which put a blue outline on every
	// secondary button on the page — seven of them on the tournament screen
	// alone, none of them primary. When every control is accent, none reads as
	// the primary one. It rests on the neutral border and picks up accent on
	// hover, so the affordance survives without the shouting.
	const variants: Record<Variant, string> = {
		primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-(--shadow-subtle)',
		ghost: 'bg-transparent text-primary border border-border hover:border-accent hover:bg-subtle',
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
