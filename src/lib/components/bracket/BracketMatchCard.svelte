<script lang="ts">
	import type { Match, MatchSide, MatchStatus } from '$lib/types/bracket';

	let {
		match,
		href,
		onclick
	}: {
		match: Match;
		// Renders the card as a link when set (e.g. a public bracket page linking
		// to a match detail route).
		href?: string;
		// Renders the card as a button when set instead (e.g. the organizer
		// Bracket tab opening a score/schedule edit panel). `href` wins if both
		// are somehow given, matching BurgundyMatchNode's precedence.
		onclick?: () => void;
	} = $props();

	const interactive = $derived(!!href || !!onclick);

	const isBye = $derived(match.status === 'bye');

	// A slot with no team: bye shows "Bye", a decided-but-unresolved feed shows
	// its source label ("Winner of QF1"), everything else is a bare "TBD" —
	// same fallback order as the original bracket renderer this replaces.
	function label(side: MatchSide): string {
		return side.team?.name ?? (isBye ? 'Bye' : (side.sourceLabel ?? 'TBD'));
	}
	// scoreLine (set-by-set, e.g. "6 4 6") wins when present; otherwise fall
	// back to a single number + optional penalty shootout suffix "6 (7)".
	function scoreText(side: MatchSide): string {
		if (side.scoreLine != null) return side.scoreLine;
		if (side.score == null) return '';
		return side.penalties != null ? `${side.score} (${side.penalties})` : `${side.score}`;
	}
	function isWinner(side: 'home' | 'away'): boolean {
		return match.winner === side;
	}
	function isLoser(side: 'home' | 'away'): boolean {
		return match.winner != null && match.winner !== side;
	}
	// Score renders for every status where a result (even partial, for `live`)
	// exists to show — everything except the not-yet-played states.
	const showsScore = $derived(
		match.status === 'finished' ||
			match.status === 'live' ||
			match.status === 'walkover' ||
			match.status === 'bye'
	);

	const statusLabel: Partial<Record<MatchStatus, string>> = {
		finished: 'Final',
		live: 'Live',
		walkover: 'Walkover'
	};
</script>

<svelte:element
	this={href ? 'a' : onclick ? 'button' : 'article'}
	{href}
	{onclick}
	type={onclick && !href ? 'button' : undefined}
	role={onclick && !href ? 'button' : undefined}
	class="card"
	class:finished={match.status === 'finished'}
	class:live={match.status === 'live'}
	class:bye={isBye}
	class:interactive
	aria-label="{label(match.home)} versus {label(match.away)}"
>
	<header class="meta">
		<span class="date">{match.dateLabel}</span>
		{#if statusLabel[match.status]}
			<span class="status">{statusLabel[match.status]}</span>
		{:else if match.timeLabel}
			<span class="time">{match.timeLabel}</span>
		{/if}
	</header>

	<div class="side" class:winner={isWinner('home')} class:loser={isLoser('home')}>
		<span
			class="team"
			class:tbd={!match.home.team}
			class:bye-slot={isBye && !match.home.team}
		>
			{label(match.home)}
		</span>
		{#if showsScore}
			<span class="score">{scoreText(match.home)}</span>
		{/if}
		{#if isWinner('home')}<span class="winner-mark" aria-hidden="true"></span>{/if}
	</div>

	<div class="side" class:winner={isWinner('away')} class:loser={isLoser('away')}>
		<span
			class="team"
			class:tbd={!match.away.team}
			class:bye-slot={isBye && !match.away.team}
		>
			{label(match.away)}
		</span>
		{#if showsScore}
			<span class="score">{scoreText(match.away)}</span>
		{/if}
		{#if isWinner('away')}<span class="winner-mark" aria-hidden="true"></span>{/if}
	</div>
</svelte:element>

<style>
	.card {
		width: var(--bk-card-w, 240px);
		height: var(--bk-card-h, 76px);
		display: flex;
		flex-direction: column;
		border-radius: 10px;
		background: var(--bk-card-bg, var(--color-surface));
		border: 1px solid var(--bk-card-border, var(--color-border));
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
		overflow: hidden;
		/* Reset the browser defaults a native <button>/<a> would otherwise bring
		   (text-align, font inheritance, padding, underline) — the card renders
		   as one of those instead of <article> when interactive. */
		text-align: left;
		font: inherit;
		color: inherit;
		text-decoration: none;
		padding: 0;
		appearance: none;
	}
	/* Live: an in-progress match gets an accent-colored border so it stands out
	   while scanning a round of otherwise-neutral cards. */
	.card.live {
		border-color: var(--bk-accent, var(--color-accent));
	}
	.card.interactive {
		cursor: pointer;
	}
	.card.interactive:hover {
		border-color: var(--bk-accent, var(--color-accent));
	}
	.card.interactive:focus-visible {
		outline: 2px solid var(--bk-accent, var(--color-accent));
		outline-offset: 2px;
	}

	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 3px 10px;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--bk-muted, var(--color-muted));
		background: var(--bk-meta-bg, var(--color-subtle));
		border-bottom: 1px solid var(--bk-card-border, var(--color-border));
	}
	.status {
		color: var(--bk-accent, var(--color-accent));
		font-weight: 600;
	}
	/* Bye/walkover read as "decided without a real contest" rather than "won" —
	   gold instead of accent keeps that distinct from a properly played result. */
	.card.bye .status {
		color: var(--bk-gold, var(--color-gold));
	}

	.side {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		position: relative;
	}
	.side + .side {
		border-top: 1px solid var(--bk-card-border, var(--color-border));
	}

	.team {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		font-weight: 500;
		color: var(--bk-text, var(--color-primary));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.team.tbd {
		color: var(--bk-muted, var(--color-muted));
		font-style: italic;
		font-weight: 400;
	}
	/* A genuine bye ("no opponent") reads differently from an undecided TBD —
	   gold rather than muted-italic, so it's clear the slot isn't just pending. */
	.team.bye-slot {
		color: var(--bk-gold, var(--color-gold));
		font-style: normal;
		font-weight: 500;
	}

	.score {
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 700;
		color: var(--bk-text, var(--color-primary));
		min-width: 1.6em;
		text-align: right;
	}

	/* Winner: full-strength text + a small marker dot. Loser (finished match,
	   not this side): dimmed so the eye lands on the winner immediately. */
	.side.winner .team,
	.side.winner .score {
		color: var(--bk-winner, var(--color-accent));
		font-weight: 700;
	}
	.side.loser .team,
	.side.loser .score {
		color: var(--bk-muted, var(--color-muted));
		font-weight: 400;
	}
	.winner-mark {
		position: absolute;
		left: 2px;
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--bk-accent, var(--color-accent));
	}

	@media (prefers-reduced-motion: no-preference) {
		.card {
			transition:
				transform 450ms cubic-bezier(0.22, 1, 0.36, 1),
				box-shadow 200ms ease-out;
		}
	}

	/* Width comes from --bk-card-w in every tier — PagedKnockoutBracket already
	   sets it per breakpoint (constantsForWidth in bracket-layout.ts), and at
	   the mobile tier that value is additionally fitted to the exact viewport
	   so the card never overflows next to the nav buttons. This rule only
	   trims type/spacing that CSS alone should own. */
	@media (max-width: 1024px) {
		.meta {
			padding: 2px 8px;
			font-size: 9px;
		}
		.side {
			padding: 0 8px;
			gap: 6px;
		}
	}
	@media (max-width: 640px) {
		.team,
		.score {
			font-size: 12px;
		}
	}
</style>
