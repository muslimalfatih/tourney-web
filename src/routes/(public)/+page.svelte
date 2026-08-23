<script lang="ts">
	// Homepage hero — full-bleed image, oversized serif headline with an italic
	// accent + hand-drawn squiggle, two pill CTAs, and a floating "courtside
	// board" card (the product's presentation mode) anchored bottom-right.
	// Background: static/home-hero.webp (supplied asset, 640×440 — upscaled
	// under a heavy scrim on purpose; swap for a larger master when available).
	const DEMO = '/tournaments/renon-cup-2026';
</script>

<svelte:head>
	<title>tourney.social — live draws for tennis & padel tournaments</title>
	<meta
		name="description"
		content="Live brackets, courtside scoreboards and shareable schedules for tennis and padel tournaments — built for the clubs that run them."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<section class="hero">
	<div class="hero-scrim" aria-hidden="true"></div>

	<div class="hero-content">
		<p class="hero-eyebrow">Tennis &amp; padel tournaments</p>

		<h1 class="hero-title" style="text-wrap: balance">
			Every weekend cup,<br />
			played like a
			<span class="hero-accent">
				final<svg class="hero-squiggle" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
					<path d="M2 8 Q 12 2, 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 118 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				</svg>
			</span>
		</h1>

		<p class="hero-sub">
			Live brackets, courtside scoreboards and shareable schedules — for the
			people who actually run the tournament, not just watch it.
		</p>

		<div class="hero-ctas">
			<a href={DEMO} class="pill pill--solid">See a live tournament</a>
			<a href="/login" class="pill pill--ghost">Run your own</a>
		</div>
	</div>

	<!-- Floating card: the presentation mode, one click away. -->
	<a href="{DEMO}/present" class="board-card">
		<span class="board-dots" aria-hidden="true"></span>
		<span class="board-label">Courtside board</span>
		<span class="board-hint">Watch Renon Cup live</span>
	</a>
</section>

<style>
	.hero {
		position: relative;
		min-height: 100vh; /* the home hero owns the whole viewport */
		display: flex;
		align-items: flex-end;
		overflow: clip;
		background:
			url('/home-hero.webp') center / cover no-repeat,
			var(--color-page, #0e1015);
	}
	/* Scrim: keeps the headline at body-text contrast over any part of the
	   photo, heaviest where the text sits. */
	.hero-scrim {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(180deg, rgb(8 10 14 / 0.35) 0%, rgb(8 10 14 / 0.15) 40%, rgb(8 10 14 / 0.78) 100%),
			radial-gradient(70vw 60vh at 18% 88%, rgb(8 10 14 / 0.65), transparent 65%);
	}

	.hero-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 72rem;
		margin-inline: auto;
		padding: clamp(4rem, 12vh, 8rem) 1.5rem clamp(3rem, 9vh, 5.5rem);
		animation: hero-rise 700ms cubic-bezier(0.2, 0, 0, 1) both;
	}
	@keyframes hero-rise {
		from {
			opacity: 0;
			translate: 0 16px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-content {
			animation: none;
		}
	}

	.hero-eyebrow {
		font-family: 'Geist Mono', ui-monospace, 'SF Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgb(255 255 255 / 0.65);
		margin-bottom: 1.25rem;
	}

	.hero-title {
		font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
		font-weight: 400;
		font-size: clamp(2.6rem, 7vw, 6rem);
		line-height: 1.04;
		letter-spacing: -0.015em;
		color: #f4f6fa;
		max-width: 16ch;
	}
	.hero-accent {
		font-style: italic;
		position: relative;
		display: inline-block;
		padding-inline-end: 0.05em;
	}
	.hero-squiggle {
		position: absolute;
		inset-inline: 0;
		bottom: -0.14em;
		width: 100%;
		height: 0.16em;
		color: var(--color-gold, #c9a227);
	}
	.hero-squiggle path {
		stroke-dasharray: 260;
		stroke-dashoffset: 260;
		animation: squiggle-draw 900ms 500ms cubic-bezier(0.2, 0, 0, 1) forwards;
	}
	@keyframes squiggle-draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-squiggle path {
			animation: none;
			stroke-dashoffset: 0;
		}
	}

	.hero-sub {
		margin-top: 1.5rem;
		max-width: 44ch;
		font-size: clamp(1rem, 1.6vw, 1.25rem);
		line-height: 1.55;
		color: rgb(255 255 255 / 0.82);
		text-wrap: pretty;
	}

	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2.25rem;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		height: 3rem;
		padding-inline: 1.6rem;
		border-radius: 9999px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		transition:
			background-color 150ms,
			border-color 150ms,
			color 150ms;
	}
	.pill--solid {
		background: var(--color-gold, #c9a227);
		color: #14110a;
	}
	.pill--solid:hover,
	.pill--solid:focus-visible {
		background: color-mix(in oklab, var(--color-gold, #c9a227) 85%, white);
	}
	.pill--ghost {
		background: rgb(255 255 255 / 0.1);
		color: #f4f6fa;
		border: 1px solid rgb(255 255 255 / 0.25);
		backdrop-filter: blur(6px);
	}
	.pill--ghost:hover,
	.pill--ghost:focus-visible {
		border-color: rgb(255 255 255 / 0.6);
		background: rgb(255 255 255 / 0.16);
	}
	.pill:focus-visible {
		outline: 2px solid var(--color-gold, #c9a227);
		outline-offset: 3px;
	}

	/* --- floating courtside-board card ------------------------------------- */
	.board-card {
		position: absolute;
		right: clamp(1rem, 4vw, 3rem);
		bottom: clamp(1rem, 6vh, 3rem);
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: clamp(180px, 18vw, 240px);
		padding: 1rem 1.1rem 1.1rem;
		border-radius: 1.25rem;
		background: rgb(10 13 19 / 0.72);
		border: 1px solid rgb(255 255 255 / 0.14);
		backdrop-filter: blur(10px);
		text-decoration: none;
		transition: border-color 150ms, translate 150ms;
	}
	.board-card:hover,
	.board-card:focus-visible {
		border-color: var(--color-gold, #c9a227);
		translate: 0 -2px;
	}
	/* A strip of the dot-matrix board — the product's signature. */
	.board-dots {
		height: 2.4rem;
		border-radius: 0.6rem;
		background:
			radial-gradient(circle 1.6px, var(--color-gold, #c9a227) 45%, transparent 55%) 0 0 / 9px 9px,
			rgb(0 0 0 / 0.5);
		opacity: 0.9;
		margin-bottom: 0.35rem;
		mask-image: linear-gradient(90deg, black 62%, transparent 96%);
	}
	.board-label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgb(255 255 255 / 0.6);
	}
	.board-hint {
		font-size: 13px;
		color: #f4f6fa;
	}

	/* On phones the card joins the flow under the CTAs instead of covering copy. */
	@media (max-width: 640px) {
		.hero {
			align-items: stretch;
		}
		.board-card {
			position: static;
			margin: 0 1.5rem 2rem;
			width: auto;
			align-self: flex-start;
		}
		.hero {
			flex-direction: column;
			justify-content: flex-end;
		}
	}
</style>
