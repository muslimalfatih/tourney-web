<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Round } from '$lib/types/bracket';
	import {
		computeBracketLayout,
		computeFullLayout,
		validateRounds,
		clampStart,
		constantsForWidth,
		SCROLL_LAYOUT_CONSTANTS,
		BREAKPOINTS,
		type LayoutConstants
	} from '$lib/utils/bracket-layout';
	import BracketRoundColumn from './BracketRoundColumn.svelte';

	let {
		rounds,
		initialRound = 0,
		// Explicit constants opt out of the built-in responsive behavior — pass
		// nothing (the common case) to get desktop/tablet/mobile presets that
		// track the viewport automatically (bracket-layout.ts: constantsForWidth).
		constants: constantsOverride,
		// Passed straight through to every BracketRoundColumn — see its own doc
		// comment. Only one of the two is typically used per bracket instance
		// (link for a read-only public page, click-handler for an editable one).
		matchHref,
		onMatchClick
	}: {
		rounds: Round[];
		initialRound?: number;
		constants?: LayoutConstants;
		matchHref?: (matchId: string) => string;
		onMatchClick?: (matchId: string) => void;
	} = $props();

	// The component's OWN rendered width — not window.innerWidth — drives the
	// responsive presets. This is deliberately container-based rather than
	// viewport-based: it stays correct when the bracket sits next to a sidebar,
	// inside a narrower panel, or embedded at less than full page width, not
	// just when the browser window itself is phone-sized. 0 is the SSR/pre-mount
	// sentinel — constantsForWidth(0) resolves to the desktop preset, so first
	// paint never flashes a mobile layout before the real size is known; the
	// ResizeObserver below corrects it on the very next frame after mount.
	let containerEl: HTMLDivElement | undefined = $state();
	let containerWidth = $state(0);
	$effect(() => {
		if (!containerEl) return;
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;
			if (width != null) containerWidth = width;
		});
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	// Tablet and mobile always get the full horizontal-scroll layout (every
	// round at once, natively scrollable) instead of paging — this is a mode
	// switch on measured width, independent of any `constants` override (an
	// override still controls sizing within whichever mode is active, it just
	// doesn't silently re-enable paging on a narrow container). 0 = unknown
	// (SSR/pre-mount) defaults to desktop/paged, matching the existing
	// SSR-safe convention so first paint never flashes the wrong mode.
	const isScrollMode = $derived(containerWidth > 0 && containerWidth < BREAKPOINTS.tablet);

	const constants = $derived(
		constantsOverride ?? (isScrollMode ? SCROLL_LAYOUT_CONSTANTS : constantsForWidth(containerWidth))
	);

	const validationError = $derived(validateRounds(rounds));

	// `initialRound` seeds the starting page only — it's read once at mount, not
	// re-applied if the prop changes later (that would yank the user back to a
	// fixed page mid-interaction). `untrack` makes that "read once" intent
	// explicit instead of leaving it as an ambiguous compiler warning.
	let start = $state(
		untrack(() => clampStart(initialRound, rounds.length, constants.visibleCols))
	);

	// Re-clamp if `rounds` changes shape at runtime (e.g. the caller swaps in a
	// bracket with a different round count) so `start` never points past it.
	$effect(() => {
		start = clampStart(start, rounds.length, constants.visibleCols);
	});

	const layout = $derived(
		validationError || isScrollMode ? null : computeBracketLayout(rounds, start, constants)
	);

	// Scroll-mode layout: every round at once, nothing windowed. Only computed
	// when actually needed (isScrollMode) — cheap either way since it's pure
	// arithmetic, but there's no reason to run both layouts every render.
	const fullLayout = $derived(
		validationError || !isScrollMode ? null : computeFullLayout(rounds, constants)
	);

	function goPrev() {
		if (layout?.canPrev) start -= 1;
	}
	function goNext() {
		if (layout?.canNext) start += 1;
	}

	// Which edge the newest column entered from, so its fly transition reads in
	// the direction the user paged.
	let direction: 'forward' | 'backward' = $state('forward');
	// Whether the user has paged at least once — the nav-hint bounce (below)
	// is a discoverability nudge for "there's more this way", not a permanent
	// decoration, so it stops the moment the user has actually found the
	// control and used it once.
	let hasPaged = $state(false);
	function prev() {
		direction = 'backward';
		hasPaged = true;
		goPrev();
	}
	function next() {
		direction = 'forward';
		hasPaged = true;
		goNext();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') prev();
		if (e.key === 'ArrowRight') next();
	}

	// --- Scroll-mode affordance ------------------------------------------
	// Edge fades reflect the ACTUAL scroll position (update continuously as the
	// user scrolls); the "Swipe to see more rounds" hint is a one-time nudge —
	// shown only until the first scroll, then gone for good (not re-shown on
	// scrolling back to the start), so it never nags on a bracket the user has
	// already discovered is scrollable.
	let scrollEl: HTMLDivElement | undefined = $state();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);
	let hasScrolled = $state(false);

	function updateScrollEdges() {
		if (!scrollEl) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
		canScrollLeft = scrollLeft > 4; // small threshold — avoids flicker from sub-pixel rounding
		canScrollRight = scrollLeft < scrollWidth - clientWidth - 4;
		if (scrollLeft > 4) hasScrolled = true;
	}

	$effect(() => {
		if (!isScrollMode || !scrollEl) return;
		updateScrollEdges(); // measure once for the layout that's already there
		scrollEl.addEventListener('scroll', updateScrollEdges, { passive: true });
		const resizeObserver = new ResizeObserver(updateScrollEdges);
		resizeObserver.observe(scrollEl);
		return () => {
			scrollEl?.removeEventListener('scroll', updateScrollEdges);
			resizeObserver.disconnect();
		};
	});
</script>

<div class="bracket-root" bind:this={containerEl}>
	{#if validationError}
		<div class="bracket-error" role="alert">
			<strong>Bracket layout error.</strong>
			{validationError}
		</div>
	{:else if layout}
		<section
			class="bracket"
			aria-label="Knockout bracket, {rounds[layout.start].name} through {rounds[layout.end].name}. Use the arrow keys or the buttons to page through rounds."
		>
			<button
				type="button"
				class="nav nav-prev"
				class:nav-hidden={!layout.canPrev}
				class:nav-hint={layout.canPrev && !hasPaged}
				aria-label="Show previous round"
				aria-hidden={!layout.canPrev}
				tabindex={layout.canPrev ? 0 : -1}
				onclick={prev}
				onkeydown={onKeydown}
			>
				<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
					<path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>

		<div class="viewport" style:--bk-card-w="{constants.cardW}px" style:--bk-gap-x="{constants.gapX}px">
			<div
				class="track"
				style:height="{layout.height}px"
				style:width="{layout.width}px"
			>
				{#each layout.visibleRounds as col (col.roundIndex)}
					{@const isNewest =
						(direction === 'forward' && col.columnIndex === layout.visibleRounds.length - 1) ||
						(direction === 'backward' && col.columnIndex === 0)}
					<div
						class="col-wrap"
						animate:flip={{ duration: 500, easing: cubicOut }}
						in:fly={{
							x: direction === 'forward' ? 48 : -48,
							duration: isNewest ? 500 : 0,
							easing: cubicOut
						}}
						out:fly={{
							x: direction === 'forward' ? -48 : 48,
							duration: 350,
							easing: cubicOut
						}}
					>
						<BracketRoundColumn
							layout={col}
							gapWidth={constants.gapX}
							hasNextColumn={col.columnIndex < layout.visibleRounds.length - 1}
							{matchHref}
							{onMatchClick}
						/>
					</div>
				{/each}
			</div>
		</div>

		<button
				type="button"
				class="nav nav-next"
				class:nav-hidden={!layout.canNext}
				class:nav-hint={layout.canNext && !hasPaged}
				aria-label="Show next round"
				aria-hidden={!layout.canNext}
				tabindex={layout.canNext ? 0 : -1}
				onclick={next}
				onkeydown={onKeydown}
			>
				<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
					<path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		</section>
	{:else if fullLayout}
		<section
			class="bracket bracket-scroll-mode"
			aria-label="Knockout bracket, {rounds[0].name} through {rounds[rounds.length - 1].name}. Scroll horizontally to see every round."
		>
			<!-- Native scroll container. No paging state, no nav buttons — the
			     browser owns the scroll physics entirely, which is what makes it
			     feel native on iOS Safari / Android Chrome (a JS-driven scroll
			     would fight momentum scrolling and rubber-banding). -->
			<div
				class="scroll-container"
				bind:this={scrollEl}
				style:--bk-card-w="{constants.cardW}px"
				style:--bk-gap-x="{constants.gapX}px"
			>
				<div class="scroll-track" style:height="{fullLayout.height}px">
					{#each fullLayout.rounds as col (col.roundIndex)}
						<div class="col-wrap col-snap">
							<BracketRoundColumn
								layout={col}
								gapWidth={constants.gapX}
								hasNextColumn={col.roundIndex < fullLayout.rounds.length - 1}
								{matchHref}
								{onMatchClick}
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Edge fades: purely visual, reflect real scroll position. -->
			{#if canScrollLeft}
				<div class="edge-fade edge-fade-left" aria-hidden="true"></div>
			{/if}
			{#if canScrollRight}
				<div class="edge-fade edge-fade-right" aria-hidden="true"></div>
			{/if}

			<!-- One-time nudge: visible until the user scrolls even slightly, then
			     gone for the rest of the session (hasScrolled is sticky). -->
			{#if !hasScrolled && canScrollRight}
				<div class="swipe-hint" transition:fade={{ duration: 200 }} aria-hidden="true">
					<span>Swipe to see more rounds</span>
					<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
						<path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	/* The measured element (bind:this={containerEl}). Full-width block so
	   ResizeObserver reports the space actually available to the bracket, not
	   just however wide its own content happens to be — that would be circular
	   (content sizes itself from a measurement of its own current size). */
	.bracket-root {
		width: 100%;
	}

	.bracket {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 24px 0;
		background: var(--bk-bg, #0e1015);
		color: var(--bk-text, #e7e9ee);
		/* No font-family here — inherits from whatever page embeds this
		   component (the demo's own <main> sets a sans stack; Laga's real pages
		   set --font-body globally on <body>), so this stays theme-neutral
		   instead of overriding a caller's typography. */
	}

	.viewport {
		overflow: hidden;
		max-width: 100%;
	}
	.track {
		position: relative;
		display: flex;
		align-items: flex-start;
	}
	@media (prefers-reduced-motion: no-preference) {
		.track {
			transition:
				height 500ms cubic-bezier(0.22, 1, 0.36, 1),
				width 500ms cubic-bezier(0.22, 1, 0.36, 1);
		}
	}

	.col-wrap {
		display: flex;
		align-items: flex-start;
		flex: 0 0 auto;
	}

	.nav {
		flex: 0 0 auto;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: 1px solid var(--bk-card-border, #2a2e37);
		background: var(--bk-card-bg, #191c22);
		color: var(--bk-text, #e7e9ee);
		cursor: pointer;
	}
	.nav:hover {
		background: var(--bk-nav-hover, #23272f);
	}
	.nav:focus-visible {
		outline: 2px solid var(--bk-accent, #5b8def);
		outline-offset: 2px;
	}
	/* Hidden rather than display:none — the button keeps its box in the flex
	   row so paging to the first/last page never shifts the bracket sideways
	   as the opposite arrow reappears/disappears. */
	.nav-hidden {
		opacity: 0;
		pointer-events: none;
	}
	@media (prefers-reduced-motion: no-preference) {
		.nav {
			transition:
				background-color 150ms ease-out,
				opacity 150ms ease-out;
		}
	}

	/* One-time discoverability nudge on whichever arrow is currently usable —
	   a small side-to-side bounce hinting "there's more this way" before the
	   user has ever paged. Stops for good the moment they click once
	   (hasPaged, set in prev()/next()), so it never nags a returning user.
	   Desktop-only for free: these buttons exist only in the paged-mode
	   branch, which only renders above the tablet/mobile breakpoint — the
	   scroll-mode branch has no nav buttons at all. */
	@media (prefers-reduced-motion: no-preference) {
		.nav-hint {
			animation: nav-hint-bounce 1.6s ease-in-out infinite;
		}
		.nav-prev.nav-hint {
			animation-direction: reverse;
		}
	}
	@keyframes nav-hint-bounce {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(3px);
		}
	}

	.bracket-error {
		padding: 16px;
		border-radius: 8px;
		background: #2a1518;
		border: 1px solid #5a2328;
		color: #f4a5ab;
		font-size: 14px;
	}

	@media (prefers-reduced-motion: reduce) {
		.track,
		.nav {
			transition: none !important;
		}
	}

	/* Tablet: matches TABLET_LAYOUT_CONSTANTS's breakpoint (bracket-layout.ts
	   BREAKPOINTS.tablet). The layout math already switched to the 2-column /
	   smaller-card preset by then; this only trims the chrome around it. */
	@media (max-width: 1024px) {
		.bracket {
			gap: 8px;
			padding: 20px 0;
		}
		.nav {
			width: 32px;
			height: 32px;
		}
	}

	/* Mobile: matches BREAKPOINTS.mobile — the 1-column preset. Card width
	   itself is NOT set here; it comes from --bk-card-w, which JS already
	   computed to fit next to these exact nav buttons (constantsForWidth). */
	@media (max-width: 640px) {
		.bracket {
			gap: 6px;
			padding: 16px 0;
		}
		.nav {
			width: 30px;
			height: 30px;
		}
	}

	/* ===================================================================
	   Scroll mode (tablet + mobile): every round in one horizontally
	   scrollable row instead of a paged window. bracketkit-style — plain
	   overflow-x, no JS-driven scroll, no compressed columns.
	   =================================================================== */

	.bracket-scroll-mode {
		position: relative; /* anchors the edge fades + hint, which are absolute */
		display: block;
		padding: 20px 0;
	}

	.scroll-container {
		overflow-x: auto;
		/* No overflow-y here (was `hidden`) — the container has no fixed height,
		   so it clipped the bottom of any column taller than the container's own
		   (mis-measured) box, cropping the last card in a round instead of just
		   preventing vertical scroll. overscroll-behavior-x below already stops
		   horizontal-scroll-chaining into the page; there's no vertical scroll
		   capability to "prevent" here since nothing constrains this element's
		   height in the first place. */
		/* Legacy iOS Safari momentum scrolling. Modern Safari scrolls natively
		   with -webkit-overflow-scrolling: auto too, but `touch` is what keeps
		   the classic inertial deceleration feel pre-iOS 13 and is a no-op
		   (not harmful) on every engine that's moved past needing it. */
		-webkit-overflow-scrolling: touch;
		/* Stops a horizontal scroll at the bracket's own edge from chaining into
		   the page's vertical scroll/refresh gesture — the single biggest thing
		   that makes an embedded horizontal scroller feel "native" instead of
		   janky on both iOS Safari and Android Chrome. */
		overscroll-behavior-x: contain;
		scroll-behavior: smooth;
		/* Optional snap: gently settles on a round boundary after a flick,
		   without fighting free scrolling — "proximity" only snaps when you're
		   already close to a boundary, unlike "mandatory" which forces it. */
		scroll-snap-type: x proximity;
		-ms-overflow-style: none; /* old Edge/IE scrollbar */
		scrollbar-width: thin; /* Firefox */
	}
	/* Hide the scrollbar on WebKit while keeping it fully functional — the
	   swipe/drag/trackpad gesture still scrolls identically; this only removes
	   the visible track, which reads as chrome-y on a touch surface where the
	   edge fade + hint already communicate "more content this way". */
	.scroll-container::-webkit-scrollbar {
		height: 6px;
	}
	.scroll-container::-webkit-scrollbar-thumb {
		background: var(--bk-card-border, #2a2e37);
		border-radius: 999px;
	}
	.scroll-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.scroll-track {
		display: flex;
		align-items: flex-start;
		width: max-content; /* columns keep their natural width — never compressed */
		padding: 0 16px; /* breathing room so the first/last card isn't flush with the fade */
	}

	.col-snap {
		scroll-snap-align: start;
	}

	/* Edge fades: a soft gradient over the scroll container's own edge,
	   signalling more content without a hard visual wall. Purely decorative
	   (aria-hidden, pointer-events: none) — never intercepts the scroll/tap
	   gesture underneath it. */
	.edge-fade {
		position: absolute;
		top: 20px;
		bottom: 20px;
		width: 32px;
		pointer-events: none;
		z-index: 2;
	}
	.edge-fade-left {
		left: 0;
		background: linear-gradient(to right, var(--bk-bg, #0e1015), transparent);
	}
	.edge-fade-right {
		right: 0;
		background: linear-gradient(to left, var(--bk-bg, #0e1015), transparent);
	}

	.swipe-hint {
		position: absolute;
		right: 12px;
		bottom: -2px;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 999px;
		background: var(--bk-card-bg, #191c22);
		border: 1px solid var(--bk-card-border, #2a2e37);
		color: var(--bk-muted, #7a8194);
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
		pointer-events: none; /* a hint, not a control — never blocks the scroll/tap beneath it */
	}
	@media (prefers-reduced-motion: no-preference) {
		.swipe-hint svg {
			animation: swipe-hint-nudge 1.4s ease-in-out infinite;
		}
	}
	@keyframes swipe-hint-nudge {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-container {
			scroll-behavior: auto; /* an animated glide reads as motion; reduced-motion wants an instant jump */
		}
		.swipe-hint svg {
			animation: none;
		}
	}
</style>
