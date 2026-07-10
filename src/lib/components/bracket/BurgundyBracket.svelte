<script lang="ts">
	import type { EventBracket } from '$lib/api/endpoints/events';
	import BurgundyMatchNode from './BurgundyMatchNode.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let {
		bracket,
		matchHref,
		onMatchClick
	}: {
		bracket: EventBracket;
		matchHref?: (id: string) => string;
		// When set, clicking a match node invokes this instead of navigating —
		// used by the organizer Bracket tab to open an edit panel.
		onMatchClick?: (id: string) => void;
	} = $props();

	// Zoom via a CSS scale on the bracket surface. Pan is native horizontal
	// scroll. This is a DOM/CSS bracket — full control over the Burgundy look,
	// no third-party widget.
	let zoom = $state(1);
	const hasRounds = $derived(bracket.rounds.some((r) => r.matches.length > 0));

	// Sofascore-style connector lines drawn as a measured SVG overlay. We read
	// each card's pre-scale offset box (so zoom never needs a recompute — the SVG
	// lives inside the scaled surface and scales with it) and connect single-elim
	// feeders: matches 2i and 2i+1 in round r flow into match i of round r+1.
	let surface = $state<HTMLDivElement>();
	// card wrapper elements, keyed `${roundIndex}:${matchIndex}` — a map avoids
	// the array-shape race a `bind:this` 2D array hits when the draw changes.
	const cards = new Map<string, HTMLElement>();
	function card(node: HTMLElement, key: string) {
		cards.set(key, node);
		return { destroy: () => cards.delete(key) };
	}
	let connectors = $state<string[]>([]);
	let dims = $state({ w: 0, h: 0 });
	let animate = $state(false);

	const reduceMotion =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	function measure() {
		const host = surface;
		if (!host) return;
		// offsetLeft/Top are *pre-transform* — immune to the zoom scale — and are
		// relative to `offsetParent`. The columns are static, so every card's
		// offsetParent is `surface`, giving one shared coordinate space. The SVG
		// lives inside the same scaled surface, so it scales in lockstep. No
		// getBoundingClientRect, no per-zoom recompute.
		const lines: string[] = [];
		const rounds = bracket.rounds;
		for (let r = 0; r < rounds.length - 1; r++) {
			for (let i = 0; i < rounds[r].matches.length; i++) {
				const from = cards.get(`${r}:${i}`);
				const to = cards.get(`${r + 1}:${Math.floor(i / 2)}`);
				if (!from || !to) continue;
				const x1 = from.offsetLeft + from.offsetWidth;
				const y1 = from.offsetTop + from.offsetHeight / 2;
				const x2 = to.offsetLeft;
				const y2 = to.offsetTop + to.offsetHeight / 2;
				const midX = (x1 + x2) / 2;
				// squared elbow: stub right, drop/rise, stub into child
				lines.push(`M${x1},${y1} H${midX} V${y2} H${x2}`);
			}
		}
		dims = { w: host.offsetWidth, h: host.offsetHeight };
		connectors = lines;
	}

	$effect(() => {
		// re-measure whenever the draw changes; rAF lets layout settle first.
		// Zoom needs no recompute — offsetLeft/Top are pre-transform.
		void bracket;
		const raf = requestAnimationFrame(() => {
			measure();
			if (!reduceMotion) {
				animate = false;
				requestAnimationFrame(() => (animate = true));
			} else {
				animate = true;
			}
		});
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (!surface) return;
		const ro = new ResizeObserver(() => measure());
		ro.observe(surface);
		return () => ro.disconnect();
	});
</script>

{#if hasRounds}
	<div class="mb-4 flex items-center gap-2">
		<div class="inline-flex items-center overflow-hidden rounded-pill border border-border">
			<button
				class="grid size-8 place-items-center text-lg text-primary transition-[background-color,transform] duration-100 ease-out hover:bg-subtle active:scale-90 motion-reduce:active:scale-100"
				aria-label="Zoom out"
				onclick={() => (zoom = Math.max(0.6, zoom - 0.1))}>−</button
			>
			<span class="px-2 text-[11px] tabular-nums text-muted">{Math.round(zoom * 100)}%</span>
			<button
				class="grid size-8 place-items-center text-lg text-primary transition-[background-color,transform] duration-100 ease-out hover:bg-subtle active:scale-90 motion-reduce:active:scale-100"
				aria-label="Zoom in"
				onclick={() => (zoom = Math.min(1.4, zoom + 0.1))}>+</button
			>
		</div>
	</div>

	<div class="bracket-scroll overflow-x-auto pb-4">
		<div
			bind:this={surface}
			class="relative flex min-h-[24rem] origin-top-left gap-10 px-1 transition-transform duration-200 ease-out motion-reduce:transition-none"
			style="transform: scale({zoom}); width: {100 / zoom}%"
		>
			{#each bracket.rounds as round, r (round.round_number)}
				<div class="flex min-w-[13rem] flex-col">
					<div class="mb-3 px-1">
						<h3 class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{round.name}</h3>
						<p class="text-[11px] text-muted">
							{round.matches.length} match{round.matches.length === 1 ? '' : 'es'}
						</p>
					</div>
					<div class="flex flex-1 flex-col justify-around gap-6">
						{#each round.matches as m, i (m.id)}
							<div use:card={`${r}:${i}`}>
								<BurgundyMatchNode
									match={m}
									href={matchHref?.(m.id)}
									onclick={onMatchClick ? () => onMatchClick(m.id) : undefined}
								/>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Connector overlay: last child so it paints over the gaps between
			     cards; pointer-events-none keeps the cards clickable. Fades in as a
			     group (materialize) rather than a per-path dash-draw. Sized in the
			     surface's unscaled space and scales with it. -->
			<svg
				class="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none"
				class:opacity-0={!animate}
				width={dims.w}
				height={dims.h}
				fill="none"
				aria-hidden="true"
			>
				{#each connectors as d, i (i)}
					<path
						{d}
						stroke="var(--color-accent)"
						stroke-width="2"
						stroke-linejoin="round"
						stroke-opacity="0.45"
					/>
				{/each}
			</svg>
		</div>
	</div>
{:else}
	<EmptyState
		title="Draw not yet generated"
		message="Add participants, then build the bracket from the Match builder."
	/>
{/if}
