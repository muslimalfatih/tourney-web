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

	// A status tag reports state; it is not a control. Filling `published` with
	// solid accent gave every "Public" / "Published" chip the same weight as the
	// primary button (five of them on the tournament screen), so they read as
	// clickable and drowned out the real actions. The tint keeps the semantic
	// blue and hands the emphasis back. Matches Badge's `accent` tone.
	const tones: Record<Tone, string> = {
		draft: 'bg-subtle text-muted border-border',
		published: 'bg-accent/10 text-accent border-accent/30',
		archived: 'bg-transparent text-muted border-border',
		gold: 'bg-transparent text-gold border-gold',
		neutral: 'bg-subtle text-muted border-border'
	};
	const led: Record<Tone, string> = {
		draft: 'bg-muted',
		published: 'bg-accent',
		archived: 'bg-accent-soft',
		gold: 'bg-gold',
		neutral: 'bg-muted'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.12em] leading-[1.4]',
		tones[tone],
		className
	)}
>
	<span class={cn('size-1.5 rounded-full', led[tone])}></span>
	{@render children()}
</span>
