<script lang="ts">
	// A single elbow connector joining two feeder match slots into the slot that
	// follows them in the next round. Pure div/border geometry — no SVG, no
	// foreignObject. Positioned absolutely inside a column's connector gutter
	// (the GAP_X strip to the right of the column), sized from the two feeder
	// slot tops it's given.
	//
	// Shape: a short horizontal stub out of each feeder card's vertical center,
	// a vertical spine joining the two stub ends, and a short horizontal stub
	// from the spine's midpoint into the next card. All three pieces are plain
	// divs with a border-color background, so they render identically on every
	// engine including Safari/WebKit (the original motivation for avoiding SVG
	// path connectors, which have historically had hairline/antialiasing bugs
	// on WebKit at fractional pixel positions).
	let {
		topFeederCenter,
		bottomFeederCenter,
		gapWidth,
		lineColor = 'var(--bk-connector, #3a3f4b)',
		thickness = 2
	}: {
		// Vertical center (px, relative to the column) of the top and bottom
		// feeder cards this connector joins.
		topFeederCenter: number;
		bottomFeederCenter: number;
		gapWidth: number;
		lineColor?: string;
		thickness?: number;
	} = $props();

	// Elbow midpoint: horizontally halfway across the gutter, vertically
	// halfway between the two feeders — this is where the outgoing stub to the
	// next round's card originates.
	const midX = $derived(gapWidth / 2);
	const midY = $derived((topFeederCenter + bottomFeederCenter) / 2);
	const spineTop = $derived(Math.min(topFeederCenter, bottomFeederCenter));
	const spineHeight = $derived(Math.abs(bottomFeederCenter - topFeederCenter));
</script>

<div class="connector" style:--bk-line={lineColor} style:--bk-thickness="{thickness}px">
	<!-- stub out of the top feeder -->
	<span
		class="stub stub-h"
		style:top="{topFeederCenter}px"
		style:left="0px"
		style:width="{midX}px"
	></span>
	<!-- stub out of the bottom feeder -->
	<span
		class="stub stub-h"
		style:top="{bottomFeederCenter}px"
		style:left="0px"
		style:width="{midX}px"
	></span>
	<!-- vertical spine joining the two stub ends -->
	<span class="stub stub-v" style:top="{spineTop}px" style:left="{midX}px" style:height="{spineHeight}px"
	></span>
	<!-- outgoing stub into the next round's card -->
	<span
		class="stub stub-h"
		style:top="{midY}px"
		style:left="{midX}px"
		style:width="{gapWidth - midX}px"
	></span>
</div>

<style>
	.connector {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.stub {
		position: absolute;
		background: var(--bk-line);
	}
	.stub-h {
		height: var(--bk-thickness);
		transform: translateY(-50%);
	}
	.stub-v {
		width: var(--bk-thickness);
	}

	@media (prefers-reduced-motion: no-preference) {
		.stub {
			transition:
				top 500ms cubic-bezier(0.22, 1, 0.36, 1),
				left 500ms cubic-bezier(0.22, 1, 0.36, 1),
				width 500ms cubic-bezier(0.22, 1, 0.36, 1),
				height 500ms cubic-bezier(0.22, 1, 0.36, 1);
		}
	}
</style>
