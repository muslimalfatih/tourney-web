<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Tone = 'neutral' | 'accent' | 'gold';
	let {
		tone = 'neutral',
		class: className = '',
		children
	}: { tone?: Tone; class?: string; children: Snippet } = $props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-subtle text-muted border-border',
		accent: 'bg-accent/10 text-accent border-accent/30',
		gold: 'bg-transparent text-gold border-gold'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em]',
		tones[tone],
		className
	)}
>
	{@render children()}
</span>
