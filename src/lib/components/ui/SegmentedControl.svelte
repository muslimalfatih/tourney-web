<script lang="ts" generics="T extends string | null">
	// Pill-in-pill segmented control (the phase/view + gender toggles). A subtle
	// track holds the options; the active one is an accent-filled pill. One
	// visual language everywhere: active = accent fill + on-accent text.
	import { cn } from '$lib/utils/cn';

	let {
		options,
		value,
		onchange,
		size = 'md',
		class: klass = ''
	}: {
		// `disabled` renders the option greyed + non-clickable (e.g. a phase the
		// event doesn't have) while keeping it visible in the track.
		options: { value: T; label: string; disabled?: boolean }[];
		value: T;
		onchange: (v: T) => void;
		size?: 'sm' | 'md';
		class?: string;
	} = $props();

	const pad = $derived(size === 'sm' ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-[11px]');
</script>

<div
	class={cn(
		'inline-flex items-center rounded-pill border border-border bg-page p-1',
		klass
	)}
	role="group"
>
	{#each options as opt (opt.value)}
		<button
			type="button"
			aria-pressed={value === opt.value}
			disabled={opt.disabled}
			onclick={() => onchange(opt.value)}
			class={cn(
				'cursor-pointer rounded-pill font-bold uppercase tracking-[0.08em] leading-none transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
				pad,
				value === opt.value
					? 'bg-accent text-on-accent shadow-(--shadow-subtle)'
					: 'text-muted enabled:hover:text-primary'
			)}>{opt.label}</button
		>
	{/each}
</div>
