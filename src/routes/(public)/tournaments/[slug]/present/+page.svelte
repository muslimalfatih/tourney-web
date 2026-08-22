<script lang="ts">
	import type { PublicTournament } from '$lib/api/types';
	import type { BracketMatch } from '$lib/api/endpoints/events';
	import type { ScheduleSlot } from '$lib/api/endpoints/schedule';
	import { getPublicMatch } from '$lib/api/endpoints/tournaments';
	import type { MatchDetail } from '$lib/api/endpoints/matches';
	import { page } from '$app/state';
	import { LiveConnection } from '$lib/stores/live.svelte';
	import { loadDeck, type DeckData, type DivisionDeck } from './deck';
	import { adaptBracketRounds } from '$lib/utils/bracket-adapter';
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import { zonedDayLabel, zonedTime } from '$lib/utils/tz';
	import { shareUrl, qrSvg } from '$lib/utils/share';
	import { SITE_BASE_URL } from '$lib/config/env';
	import LightBoard from '$lib/components/ui/LightBoard.svelte';
	import {
		Play,
		Pause,
		ChevronLeft,
		ChevronRight,
		Maximize,
		Minimize,
		X
	} from '@lucide/svelte';

	let { data }: { data: { tournament: PublicTournament; deck: DeckData } } = $props();

	const tz = $derived(data.tournament.timezone);

	// --- Live data (SSE refetch over the initial load) ---------------------
	let liveDeck = $state<DeckData | null>(null);
	const deck = $derived(liveDeck ?? data.deck);

	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const conn = new LiveConnection(data.tournament.slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});
	$effect(() => {
		const ev = live?.lastEvent;
		const gen = live?.generation ?? 0;
		if (!ev && gen === 0) return;
		loadDeck(data.tournament.slug, data.tournament.events ?? [], fetch)
			.then((d) => (liveDeck = d))
			.catch(() => {});
	});

	// --- Slide content ------------------------------------------------------
	// A division's flat match list (SE/RR bracket reads + GK knockout).
	function divisionMatches(d: DivisionDeck): { m: BracketMatch; division: string }[] {
		const label = d.event.public_display_name ?? d.event.name;
		const rounds = d.bracket?.rounds ?? d.gk?.knockout ?? [];
		return rounds.flatMap((r) => r.matches.map((m) => ({ m, division: label })));
	}
	const allMatches = $derived(deck.divisions.flatMap(divisionMatches));
	const playable = $derived(allMatches.filter(({ m }) => m.participants?.some((p) => p.participant_id)));

	const DECIDED = new Set(['completed', 'walkover', 'retired']);
	const liveMatches = $derived(playable.filter(({ m }) => m.status === 'live'));
	const upcoming = $derived(
		deck.schedule
			.filter((s) => s.match_id && (s.match_status === 'scheduled' || s.match_status === null))
			.filter((s) => new Date(s.ends_at).getTime() > Date.now())
			.slice(0, 6)
	);
	const recent = $derived(
		playable
			.filter(({ m }) => DECIDED.has(m.status))
			.sort((a, b) => (b.m.scheduled_at ?? '').localeCompare(a.m.scheduled_at ?? ''))
			.slice(0, 6)
	);

	// Live matches show real set scores — one small public fetch per live match.
	let liveScores = $state<Record<string, MatchDetail>>({});
	$effect(() => {
		const ids = liveMatches.map(({ m }) => m.id);
		for (const id of ids) {
			getPublicMatch(id)
				.then((md) => (liveScores = { ...liveScores, [id]: md as MatchDetail }))
				.catch(() => {});
		}
	});

	const standingsSlides = $derived(
		deck.divisions
			.map((d) => ({
				label: d.event.public_display_name ?? d.event.name,
				groups: d.gk
					? d.gk.groups.filter((g) => g.standings.length > 0)
					: d.standings?.length
						? [{ id: d.event.id, name: '', advance_count: 0, standings: d.standings }]
						: []
			}))
			.filter((s) => s.groups.length > 0)
	);
	const bracketSlides = $derived(
		deck.divisions
			.map((d) => ({
				label: d.event.public_display_name ?? d.event.name,
				rounds: adaptBracketRounds(
					d.event.format === 'group_knockout' ? (d.gk?.knockout ?? []) : (d.bracket?.rounds ?? []),
					tz
				)
			}))
			.filter((s) => s.rounds.length > 0 && d3HasReal(s.rounds))
	);
	// A knockout slide earns its place only when at least one slot resolved.
	function d3HasReal(rounds: { matches: { home: { team: unknown | null }; away: { team: unknown | null } }[] }[]): boolean {
		return rounds.some((r) => r.matches.some((m) => m.home.team || m.away.team));
	}

	type Slide =
		| { kind: 'title' }
		| { kind: 'live' }
		| { kind: 'upcoming' }
		| { kind: 'recent' }
		| { kind: 'standings'; index: number }
		| { kind: 'bracket'; index: number }
		| { kind: 'empty' }
		| { kind: 'share' };

	const slides = $derived.by<Slide[]>(() => {
		const out: Slide[] = [{ kind: 'title' }];
		const hasAny =
			liveMatches.length > 0 || upcoming.length > 0 || recent.length > 0 ||
			standingsSlides.length > 0 || bracketSlides.length > 0;
		if (!hasAny) out.push({ kind: 'empty' });
		if (liveMatches.length > 0) out.push({ kind: 'live' });
		if (upcoming.length > 0) out.push({ kind: 'upcoming' });
		if (recent.length > 0) out.push({ kind: 'recent' });
		standingsSlides.forEach((_, index) => out.push({ kind: 'standings', index }));
		bracketSlides.forEach((_, index) => out.push({ kind: 'bracket', index }));
		out.push({ kind: 'share' });
		return out;
	});

	// --- Rotation & controls ------------------------------------------------
	let idx = $state(0);
	let paused = $state(false);
	// ?interval= seconds, clamped; changeable from the control bar.
	const initialInterval = Number(page.url.searchParams.get('interval') ?? '10');
	let intervalSec = $state(
		Number.isFinite(initialInterval) ? Math.min(120, Math.max(4, initialInterval)) : 10
	);

	const current = $derived(slides[Math.min(idx, slides.length - 1)]);
	function next() {
		idx = (idx + 1) % slides.length;
	}
	function prev() {
		idx = (idx - 1 + slides.length) % slides.length;
	}
	// The timer restarts whenever pause state, the interval, or the slide
	// changes — a manual jump therefore always gets a full dwell time.
	$effect(() => {
		if (paused || slides.length < 2) return;
		void idx;
		const t = setInterval(next, intervalSec * 1000);
		return () => clearInterval(t);
	});

	// --- Fullscreen ---------------------------------------------------------
	let isFullscreen = $state(false);
	function toggleFullscreen() {
		if (document.fullscreenElement) void document.exitFullscreen();
		else void document.documentElement.requestFullscreen?.();
	}
	$effect(() => {
		const onChange = () => (isFullscreen = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onChange);
		return () => document.removeEventListener('fullscreenchange', onChange);
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') next();
		else if (e.key === 'ArrowLeft') prev();
		else if (e.key === ' ') {
			e.preventDefault();
			paused = !paused;
		} else if (e.key.toLowerCase() === 'f') toggleFullscreen();
	}

	const slideLabel = $derived(
		current.kind === 'standings'
			? `Standings — ${standingsSlides[current.index]?.label ?? ''}`
			: current.kind === 'bracket'
				? `Bracket — ${bracketSlides[current.index]?.label ?? ''}`
				: { title: data.tournament.name, live: 'Live now', upcoming: 'Up next',
					recent: 'Latest results', share: 'Follow along', empty: 'Waiting for matches' }[current.kind]
	);

	const currentShareUrl = $derived(
		shareUrl(new URL(`/tournaments/${data.tournament.slug}`, SITE_BASE_URL || page.url.origin))
	);
	const shareQr = $derived(qrSvg(currentShareUrl));

	function matchSides(m: BracketMatch) {
		const s1 = m.participants.find((p) => p.slot === 1);
		const s2 = m.participants.find((p) => p.slot === 2);
		return [s1?.display_name ?? 'TBD', s2?.display_name ?? 'TBD'];
	}
	function scoreline(md: MatchDetail | undefined, slot: 1 | 2): string {
		if (!md?.sets?.length) return '';
		return md.sets.map((s) => (slot === 1 ? s.games_a : s.games_b)).join('  ');
	}
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
	<title>{data.tournament.name} — Presentation</title>
</svelte:head>

<!-- Fullscreen court-display deck. Overlays the public chrome entirely; the
     close control returns to the tournament page. -->
<div class="fixed inset-0 z-50 flex flex-col bg-page text-primary">
	<!-- Slide area -->
	<div class="relative min-h-0 flex-1">
		{#key idx}
			<section
				class="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-hidden px-[4vw] py-[4vh] motion-safe:animate-[present-fade_400ms_ease-out]"
				aria-label={typeof slideLabel === 'string' ? slideLabel : ''}
			>
				{#if current.kind === 'title'}
					<div class="flex flex-col items-center gap-6 text-center">
						<LightBoard text={data.tournament.name} class="max-w-[80vw]" />
						<h1 class="sr-only">{data.tournament.name}</h1>
						<p class="text-[clamp(1rem,2vw,1.5rem)] uppercase tracking-[0.2em] text-muted">
							{[data.tournament.sport, data.tournament.location].filter(Boolean).join(' · ')}
						</p>
						{#if data.tournament.starts_on}
							<p class="text-[clamp(0.9rem,1.6vw,1.25rem)] text-muted">
								{zonedDayLabel(data.tournament.starts_on, tz)}
							</p>
						{/if}
					</div>
				{:else if current.kind === 'empty'}
					<p class="font-display text-[clamp(1.5rem,4vw,3rem)] uppercase tracking-[0.1em] text-muted" style="text-wrap: balance">
						Matches appear here once the draw begins
					</p>
				{:else if current.kind === 'live'}
					<h2 class="present-heading">
						<span class="inline-block size-[0.5em] animate-pulse rounded-full bg-danger align-middle motion-reduce:animate-none"></span>
						Live now
					</h2>
					<ul class="present-list">
						{#each liveMatches.slice(0, 4) as { m, division } (m.id)}
							{@const sides = matchSides(m)}
							<li class="present-row">
								<div class="min-w-0 flex-1">
									<p class="present-name">{sides[0]}</p>
									<p class="present-name">{sides[1]}</p>
								</div>
								<div class="shrink-0 text-right font-display tabular-nums">
									<p class="present-name text-accent">{scoreline(liveScores[m.id], 1) || '–'}</p>
									<p class="present-name text-accent">{scoreline(liveScores[m.id], 2) || '–'}</p>
								</div>
								<p class="present-meta">{division}{m.court_name ? ` · ${m.court_name}` : ''}</p>
							</li>
						{/each}
					</ul>
				{:else if current.kind === 'upcoming'}
					<h2 class="present-heading">Up next</h2>
					<ul class="present-list">
						{#each upcoming as s (s.id)}
							<li class="present-row">
								<p class="min-w-0 flex-1 truncate present-name">{s.match_label ?? 'To be decided'}</p>
								<p class="shrink-0 font-display tabular-nums present-name text-accent">
									{zonedTime(s.starts_at, tz)}
								</p>
								<p class="present-meta">
									{[s.event_name, s.court_name, zonedDayLabel(s.starts_at, tz, 'short')].filter(Boolean).join(' · ')}
								</p>
							</li>
						{/each}
					</ul>
				{:else if current.kind === 'recent'}
					<h2 class="present-heading">Latest results</h2>
					<ul class="present-list">
						{#each recent as { m, division } (m.id)}
							{@const sides = matchSides(m)}
							{@const winner1 = m.participants.find((p) => p.slot === 1)?.participant_id === m.winner_participant_id}
							<li class="present-row">
								<div class="min-w-0 flex-1">
									<p class="present-name {winner1 ? 'text-accent' : ''}">{sides[0]}</p>
									<p class="present-name {!winner1 && m.winner_participant_id ? 'text-accent' : ''}">{sides[1]}</p>
								</div>
								<div class="shrink-0 text-right font-display tabular-nums">
									<p class="present-name">{m.sets?.map((s) => s.p1).join('  ') || (m.status !== 'completed' ? m.status : '')}</p>
									<p class="present-name">{m.sets?.map((s) => s.p2).join('  ') || ''}</p>
								</div>
								<p class="present-meta">{division}</p>
							</li>
						{/each}
					</ul>
				{:else if current.kind === 'standings'}
					{@const slide = standingsSlides[current.index]}
					<h2 class="present-heading">{slide.label}</h2>
					<div class="flex w-full max-w-[88vw] flex-wrap justify-center gap-[3vw] overflow-hidden">
						{#each slide.groups.slice(0, 2) as g (g.id)}
							<table class="present-table">
								{#if g.name}
									<caption class="pb-2 text-left font-display text-[clamp(1rem,1.8vw,1.5rem)] uppercase tracking-[0.1em] text-gold">{g.name}</caption>
								{/if}
								<thead>
									<tr class="text-muted">
										<th class="pr-[2vw] text-left font-normal">Team</th>
										<th class="px-[1vw] font-normal">P</th>
										<th class="px-[1vw] font-normal">W</th>
										<th class="px-[1vw] font-normal">L</th>
									</tr>
								</thead>
								<tbody>
									{#each g.standings.slice(0, 6) as row, i (row.participant_id)}
										<tr class={i < (g.advance_count || 0) ? 'text-accent' : ''}>
											<td class="max-w-[40vw] truncate pr-[2vw] text-left">{row.display_name}</td>
											<td class="px-[1vw] text-center tabular-nums">{row.played}</td>
											<td class="px-[1vw] text-center tabular-nums">{row.won}</td>
											<td class="px-[1vw] text-center tabular-nums">{row.lost}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/each}
					</div>
				{:else if current.kind === 'bracket'}
					{@const slide = bracketSlides[current.index]}
					<h2 class="present-heading">{slide.label}</h2>
					<div class="w-full max-w-[92vw] overflow-hidden">
						<PagedKnockoutBracket rounds={slide.rounds} />
					</div>
				{:else if current.kind === 'share'}
					<h2 class="present-heading">Follow along</h2>
					<div class="rounded-xl bg-white p-[1.5vw] shadow-(--shadow-soft)">
						<div class="size-[min(34vh,34vw)]">{@html shareQr}</div>
					</div>
					<p class="font-display text-[clamp(1rem,2.2vw,1.75rem)] tracking-[0.04em] text-muted">
						{currentShareUrl.replace(/^https?:\/\//, '')}
					</p>
				{/if}
			</section>
		{/key}
	</div>

	<!-- Control bar: calm, always reachable, keyboard-equivalent. -->
	<div class="flex items-center justify-center gap-2 border-t border-border/60 px-4 py-3">
		<p class="sr-only" role="status" aria-live="polite">{slideLabel}</p>
		<button type="button" class="present-ctl" onclick={prev} aria-label="Previous slide">
			<ChevronLeft class="size-5" />
		</button>
		<button
			type="button"
			class="present-ctl"
			onclick={() => (paused = !paused)}
			aria-label={paused ? 'Resume rotation' : 'Pause rotation'}
		>
			{#if paused}<Play class="size-5" />{:else}<Pause class="size-5" />{/if}
		</button>
		<button type="button" class="present-ctl" onclick={next} aria-label="Next slide">
			<ChevronRight class="size-5" />
		</button>
		<span class="mx-2 text-[12px] tabular-nums text-muted">{idx + 1} / {slides.length}</span>
		<label class="flex items-center gap-1.5 text-[12px] text-muted">
			<span class="sr-only sm:not-sr-only">Every</span>
			<select
				bind:value={intervalSec}
				class="rounded-md border border-border bg-surface px-2 py-1 text-[13px] text-primary"
				aria-label="Rotation interval"
			>
				<option value={5}>5s</option>
				<option value={10}>10s</option>
				<option value={20}>20s</option>
				<option value={30}>30s</option>
				<option value={60}>60s</option>
			</select>
		</label>
		{#if live?.reconnecting}
			<span class="ml-2 text-[12px] text-muted">Reconnecting…</span>
		{/if}
		<span class="flex-1"></span>
		<button
			type="button"
			class="present-ctl"
			onclick={toggleFullscreen}
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
		>
			{#if isFullscreen}<Minimize class="size-5" />{:else}<Maximize class="size-5" />{/if}
		</button>
		<a href="/tournaments/{data.tournament.slug}" class="present-ctl" aria-label="Exit presentation">
			<X class="size-5" />
		</a>
	</div>
</div>

<style>
	@keyframes -global-present-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	/* Distance-readable slide primitives — sizes scale with the screen, colors
	   come from the existing tokens only. */
	:global(.present-heading) {
		font-family: var(--font-display, inherit);
		font-size: clamp(1.75rem, 4.5vw, 3.5rem);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-align: center;
		text-wrap: balance;
	}
	:global(.present-list) {
		display: flex;
		flex-direction: column;
		gap: clamp(0.75rem, 2vh, 1.5rem);
		width: min(88vw, 64rem);
	}
	:global(.present-row) {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		column-gap: 2rem;
		border-block-end: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		padding-block-end: clamp(0.5rem, 1.5vh, 1rem);
	}
	:global(.present-name) {
		font-size: clamp(1.25rem, 2.8vw, 2.25rem);
		line-height: 1.3;
	}
	:global(.present-meta) {
		grid-column: 1 / -1;
		font-size: clamp(0.8rem, 1.4vw, 1.1rem);
		color: var(--color-muted, currentColor);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	:global(.present-table) {
		border-collapse: collapse;
		font-size: clamp(1.1rem, 2.2vw, 1.9rem);
	}
	:global(.present-ctl) {
		display: grid;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border-radius: 9999px;
		color: var(--color-muted, currentColor);
		transition: color 150ms;
	}
	:global(.present-ctl:hover) {
		color: var(--color-primary, currentColor);
	}
</style>
