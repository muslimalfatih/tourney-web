<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Tone = 'neutral' | 'accent' | 'live' | 'warning' | 'gold';
	let {
		tone = 'neutral',
		class: className = '',
		children
	}: { tone?: Tone; class?: string; children: Snippet } = $props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-surface-elevated text-secondary border-border',
		accent: 'bg-accent/15 text-accent border-accent/30',
		live: 'bg-live/15 text-live border-live/30',
		warning: 'bg-warning/15 text-warning border-warning/30',
		gold: 'bg-gold/15 text-gold border-gold/30'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
		tones[tone],
		className
	)}
>
	{@render children()}
</span>
