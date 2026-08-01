<script lang="ts" generics="T extends string | null">
	// Sliding-pill segmented control. One accent pill sits in a subtle track and
	// slides (translateX by active index) to the clicked option — constant track
	// width, no layout shift. Active = accent fill + on-accent text; the label
	// colour cross-fades as the pill arrives.
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

	// Index of the active option; -1 when the current value isn't in the list
	// (then no pill shows). Drives the pill's translateX.
	const activeIndex = $derived(options.findIndex((o) => o.value === value));
	const count = $derived(options.length);
</script>

<div
	class={cn('relative inline-grid auto-cols-fr grid-flow-col items-center rounded-pill border border-border bg-page p-1', klass)}
	role="group"
>
	<!-- The single sliding pill. Rendered only when an option is active. Width is
	     one slot; it moves by whole slots via translateX. -->
	{#if activeIndex >= 0}
		<span
			aria-hidden="true"
			class="pointer-events-none absolute inset-y-1 left-1 rounded-pill bg-accent shadow-(--shadow-subtle) transition-transform duration-200 ease-out motion-reduce:transition-none"
			style="width: calc((100% - 0.5rem) / {count}); transform: translateX({activeIndex * 100}%);"
		></span>
	{/if}

	{#each options as opt (opt.value)}
		<button
			type="button"
			aria-pressed={value === opt.value}
			disabled={opt.disabled}
			onclick={() => onchange(opt.value)}
			class={cn(
				'relative z-10 cursor-pointer rounded-pill font-bold uppercase tracking-[0.08em] leading-none transition-colors duration-150 active:scale-[0.97] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
				pad,
				value === opt.value ? 'text-on-accent' : 'text-muted enabled:hover:text-primary'
			)}>{opt.label}</button
		>
	{/each}
</div>
