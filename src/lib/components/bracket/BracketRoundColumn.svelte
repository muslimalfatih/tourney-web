<script lang="ts">
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import type { MatchSlot, Round } from '$lib/types/bracket';
	import BracketMatchCard from './BracketMatchCard.svelte';
	import BracketConnector from './BracketConnector.svelte';

	// Renders one round's stack of match cards + (optionally) the connector
	// gutter feeding into the next round. Deliberately typed against the shape
	// shared by VisibleRoundLayout (paged mode) and FullRoundLayout (scroll
	// mode) rather than either directly — this component never reads
	// columnIndex/roundIndex, so it's reusable as-is by both layout modes.
	let {
		layout,
		gapWidth,
		hasNextColumn,
		matchHref,
		onMatchClick
	}: {
		layout: { round: Round; slotHeight: number; slots: MatchSlot[] };
		gapWidth: number;
		// Whether a round follows this one (in the current page, or — in scroll
		// mode — in the bracket at all) — if not, there's nothing to connect out
		// to, so the trailing gutter + connectors are skipped entirely.
		hasNextColumn: boolean;
		// Makes every match card in this column a link, e.g. to a match detail
		// route on a public bracket page.
		matchHref?: (matchId: string) => string;
		// Makes every match card in this column a button instead, e.g. opening a
		// score/schedule edit panel on the organizer Bracket tab. Ignored for a
		// card whose id `matchHref` already resolved to a link.
		onMatchClick?: (matchId: string) => void;
	} = $props();

	// Slot tops are keyed by match id for FLIP: when paging shifts a round from
	// column 2 to column 0 (say), Svelte matches it by key and animates the
	// existing DOM node to its new position instead of destroying + recreating
	// it — which is what makes the reflow read as "cards sliding to their new
	// slot" rather than a hard cut.
	const lastSlot = $derived(layout.slots[layout.slots.length - 1]);
	const columnHeight = $derived((lastSlot?.slotTop ?? 0) + (lastSlot?.slotHeight ?? 0));

	const feederPairs = $derived(
		hasNextColumn
			? Array.from({ length: Math.ceil(layout.slots.length / 2) }, (_, i) => ({
					key: `${layout.slots[i * 2]?.match.id}:${layout.slots[i * 2 + 1]?.match.id ?? ''}`,
					top: layout.slots[i * 2]?.slotTop ?? 0,
					height: layout.slots[i * 2]?.slotHeight ?? 0,
					bottomTop: (layout.slots[i * 2 + 1] ?? layout.slots[i * 2]).slotTop,
					bottomHeight: (layout.slots[i * 2 + 1] ?? layout.slots[i * 2]).slotHeight
				}))
			: []
	);
</script>

<div class="column" style:width="var(--bk-card-w)">
	<h3 class="round-header">{layout.round.name}</h3>

	<div class="slots" style:height="{columnHeight}px">
		{#each layout.slots as slot (slot.match.id)}
			<div
				class="slot"
				style:top="{slot.slotTop}px"
				style:height="{slot.slotHeight}px"
				animate:flip={{ duration: 500, easing: cubicOut }}
			>
				<div class="slot-inner">
					<BracketMatchCard
					match={slot.match}
					href={matchHref?.(slot.match.id)}
					onclick={onMatchClick ? () => onMatchClick(slot.match.id) : undefined}
				/>
				</div>
			</div>
		{/each}
	</div>
</div>

{#if hasNextColumn}
	<div class="gutter" style:width="{gapWidth}px">
		{#each feederPairs as pair (pair.key)}
			<div
				class="gutter-slot"
				style:top="{pair.top}px"
				style:height="{pair.bottomTop + pair.bottomHeight - pair.top}px"
				animate:flip={{ duration: 500, easing: cubicOut }}
			>
				<BracketConnector
					topFeederCenter={pair.height / 2}
					bottomFeederCenter={pair.bottomTop + pair.bottomHeight / 2 - pair.top}
					gapWidth={gapWidth}
				/>
			</div>
		{/each}
	</div>
{/if}

<style>
	.column {
		position: relative;
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
	}
	.round-header {
		margin: 0 0 12px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--bk-header, #aeb4c2);
		text-align: center;
	}
	.slots {
		position: relative;
	}
	.slot {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.slot-inner {
		width: 100%;
	}

	.gutter {
		position: relative;
		flex: 0 0 auto;
		align-self: stretch;
		margin-top: 32px; /* aligns with .slots start (header height ~32px) */
	}
	.gutter-slot {
		position: absolute;
		left: 0;
		right: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.round-header {
			transition: opacity 400ms ease-out;
		}
	}

	/* .gutter's width is set inline from the `gapWidth` prop (constants.gapX),
	   which is already the correct value for every breakpoint — no media query
	   needed here. At the mobile tier hasNextColumn is always false (a single
	   visible column has no next column to connect to), so .gutter doesn't
	   render there at all. */
	@media (max-width: 1024px) {
		.round-header {
			font-size: 11px;
			margin-bottom: 8px;
		}
		.gutter {
			margin-top: 26px; /* tracks the smaller round-header at this tier */
		}
	}
</style>
