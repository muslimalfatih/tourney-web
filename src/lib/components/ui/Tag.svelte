<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	// Status vocabulary reused across the app: draft / published / archived, plus
	// a gold variant reserved for seeds & special badges (never a CTA).
	type Tone = 'draft' | 'published' | 'archived' | 'gold' | 'neutral';
	let {
		tone = 'neutral',
		class: className = '',
		children
	}: { tone?: Tone; class?: string; children: Snippet } = $props();

	const tones: Record<Tone, string> = {
		draft: 'bg-subtle text-muted border-border',
		published: 'bg-accent text-on-accent border-accent',
		archived: 'bg-transparent text-muted border-border',
		gold: 'bg-transparent text-gold border-gold',
		neutral: 'bg-subtle text-muted border-border'
	};
	const led: Record<Tone, string> = {
		draft: 'bg-muted',
		published: 'bg-on-accent',
		archived: 'bg-accent-soft',
		gold: 'bg-gold',
		neutral: 'bg-muted'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] leading-[1.4]',
		tones[tone],
		className
	)}
>
	<span class={cn('size-1.5 rounded-full', led[tone])}></span>
	{@render children()}
</span>
