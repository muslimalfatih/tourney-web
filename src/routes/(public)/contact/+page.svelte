<script lang="ts">
	// Contact landing — a full-viewport section in the "floating images" style:
	// one giant serif email centered on a dark field, decorative tiles drifting
	// around it with a pointer-driven parallax, and a four-column info grid
	// anchored at the bottom. Tiles are CSS-crafted (gradients + the LightBoard
	// dot motif) so the page ships self-contained, in the tourney palette.
	const EMAIL = 'hello@tourney.social';

	// Parallax: each tile translates against the cursor at its own depth.
	// Pointer-only (no effect on touch), disabled entirely for reduced motion.
	let mx = $state(0);
	let my = $state(0);
	let reduced = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => (reduced = mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	function onPointerMove(e: PointerEvent) {
		if (reduced || e.pointerType !== 'mouse') return;
		// Normalized -1..1 from viewport center.
		mx = (e.clientX / window.innerWidth) * 2 - 1;
		my = (e.clientY / window.innerHeight) * 2 - 1;
	}

	// Tile placements: position, size, depth (parallax strength, px), and a
	// palette variant. Spread asymmetrically like scattered polaroids.
	const tiles = [
		{ top: '12%', left: '8%', w: 'clamp(90px, 11vw, 170px)', h: 'clamp(120px, 15vw, 230px)', depth: 26, variant: 'court', r: '3rem' },
		{ top: '8%', right: '10%', w: 'clamp(120px, 16vw, 260px)', h: 'clamp(90px, 12vw, 190px)', depth: 40, variant: 'gold', r: '1.25rem' },
		{ top: '46%', left: '30%', w: 'clamp(130px, 18vw, 300px)', h: 'clamp(130px, 18vw, 300px)', depth: 16, variant: 'net', r: '1.5rem' },
		{ top: '52%', right: '7%', w: 'clamp(80px, 9vw, 150px)', h: 'clamp(90px, 11vw, 180px)', depth: 48, variant: 'dusk', r: '2.5rem' },
		{ bottom: '20%', left: '14%', w: 'clamp(80px, 10vw, 160px)', h: 'clamp(80px, 10vw, 160px)', depth: 34, variant: 'gold', r: '9999px' },
		{ bottom: '14%', right: '22%', w: 'clamp(110px, 13vw, 210px)', h: 'clamp(80px, 10vw, 160px)', depth: 22, variant: 'court', r: '1rem' }
	] as const;

	function tileStyle(t: (typeof tiles)[number]): string {
		const pos = [
			'top' in t && t.top ? `top:${t.top}` : '',
			'left' in t && t.left ? `left:${t.left}` : '',
			'right' in t && t.right ? `right:${t.right}` : '',
			'bottom' in t && t.bottom ? `bottom:${t.bottom}` : ''
		]
			.filter(Boolean)
			.join(';');
		const shift = reduced ? '' : `transform: translate(${(-mx * t.depth).toFixed(1)}px, ${(-my * t.depth).toFixed(1)}px);`;
		return `${pos}; width:${t.w}; height:${t.h}; border-radius:${t.r}; ${shift}`;
	}
</script>

<!-- No title/description/canonical here: hooks.server.ts injects them from
     sitePageMeta('/contact') so a non-JS crawler sees them too. -->

<svelte:window onpointermove={onPointerMove} />

<section class="contact-stage">
	<!-- Floating tiles (decorative) -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
		{#each tiles as t, i (i)}
			<div class="tile tile--{t.variant}" class:tile-float={!reduced} style={tileStyle(t)}></div>
		{/each}
	</div>

	<!-- The email IS the page -->
	<div class="relative z-10 flex min-h-[72vh] items-center justify-center px-4">
		<a href="mailto:{EMAIL}" class="contact-email" aria-label="Email us at {EMAIL}">
			{EMAIL}
		</a>
	</div>

	<!-- Info grid -->
	<div class="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<p class="contact-label">Address</p>
			<p class="contact-body">
				Renon Courts<br />
				Denpasar, Bali, Indonesia
			</p>
		</div>
		<div>
			<p class="contact-label">Phone</p>
			<p class="contact-body">
				+62 812 0000 0000<br />
				(WhatsApp works too)
			</p>
		</div>
		<div>
			<p class="contact-label">Social</p>
			<p class="contact-body">
				<a class="contact-link" href="https://instagram.com" rel="noopener" target="_blank">Instagram</a><br />
				<a class="contact-link" href="https://x.com" rel="noopener" target="_blank">X</a>
			</p>
		</div>
		<div>
			<p class="contact-label">Manifesto</p>
			<p class="contact-body">
				Every local tournament deserves a big-stage scoreboard. Write to us and let's put yours up in lights.
			</p>
		</div>
	</div>
</section>

<style>
	.contact-stage {
		position: relative;
		background:
			radial-gradient(60vw 40vh at 50% 30%, color-mix(in oklab, var(--color-accent, #4ea1ff) 6%, transparent), transparent 70%),
			var(--color-page, #0e1015);
		overflow: clip;
	}

	/* --- the headline email ------------------------------------------------ */
	.contact-email {
		font-family: var(--font-display, Georgia, serif);
		font-size: clamp(2rem, 7.5vw, 7rem);
		line-height: 1.05;
		letter-spacing: -0.015em;
		color: var(--color-primary, #eef1f6);
		text-align: center;
		word-break: break-all;
		position: relative;
		text-decoration: none;
	}
	/* Expanding underline: scales from center on hover/focus. */
	.contact-email::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		bottom: -0.06em;
		height: 0.045em;
		background: var(--color-gold, #c9a227);
		transform: scaleX(0);
		transform-origin: center;
		transition: transform 380ms cubic-bezier(0.2, 0, 0, 1);
	}
	.contact-email:hover::after,
	.contact-email:focus-visible::after {
		transform: scaleX(1);
	}
	.contact-email:focus-visible {
		outline: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.contact-email::after {
			transition: none;
		}
	}

	/* --- info grid ---------------------------------------------------------- */
	.contact-label {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted, #8b93a3);
		margin-bottom: 0.6rem;
	}
	.contact-body {
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-primary, #eef1f6);
		max-width: 26ch;
	}
	.contact-link {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid color-mix(in oklab, currentColor 30%, transparent);
		transition: border-color 150ms;
	}
	.contact-link:hover,
	.contact-link:focus-visible {
		border-color: var(--color-gold, #c9a227);
	}

	/* --- floating tiles ------------------------------------------------------
	   Gradient "photographs" in the tourney palette; the dot layer echoes the
	   LightBoard. transform is driven inline (parallax); the float keyframe
	   rides on translate so the two compose. */
	.tile {
		position: absolute;
		opacity: 0.85;
		box-shadow: 0 24px 60px rgb(0 0 0 / 0.45);
		transition: transform 400ms cubic-bezier(0.2, 0, 0, 1);
		will-change: transform;
	}
	.tile::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background-image: radial-gradient(rgb(255 255 255 / 0.08) 1px, transparent 1.5px);
		background-size: 10px 10px;
	}
	.tile--court {
		background: linear-gradient(160deg, #16324f 0%, #0e1015 55%, #1b4d3e 130%);
	}
	.tile--gold {
		background: linear-gradient(200deg, #c9a227 -40%, #6b5714 30%, #0e1015 95%);
	}
	.tile--net {
		background:
			repeating-linear-gradient(90deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 14px),
			repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 14px),
			linear-gradient(140deg, #22304a, #0e1015 80%);
	}
	.tile--dusk {
		background: linear-gradient(180deg, #3d2f52 -20%, #16324f 45%, #0e1015 100%);
	}

	.tile-float {
		animation: tile-drift 9s ease-in-out infinite alternate;
	}
	.tile-float:nth-child(2n) {
		animation-duration: 12s;
		animation-delay: -3s;
	}
	.tile-float:nth-child(3n) {
		animation-duration: 15s;
		animation-delay: -6s;
	}
	@keyframes tile-drift {
		from {
			translate: 0 -8px;
		}
		to {
			translate: 0 10px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tile {
			transition: none;
		}
	}
</style>
