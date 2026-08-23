<script lang="ts">
	import type { PublicTournament, EventGender, EventDivision } from '$lib/api/types';
	import type { EventBracket, Standing, GroupKnockout } from '$lib/api/endpoints/events';
	import { listPublicSchedule, type ScheduleSlot } from '$lib/api/endpoints/schedule';
	import type { Participant } from '$lib/api/endpoints/participants';
	import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Card from '$lib/components/ui/Card.svelte';
	import LightBoard from '$lib/components/ui/LightBoard.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import TournamentFilterStrip from '$lib/components/public/TournamentFilterStrip.svelte';
	import TournamentSchedule from '$lib/components/public/TournamentSchedule.svelte';
	import ShareDialog from '$lib/components/public/ShareDialog.svelte';
	import { shareUrl } from '$lib/utils/share';
	import { SITE_BASE_URL } from '$lib/config/env';
	import { Share2, MonitorPlay } from '@lucide/svelte';
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import { adaptBracketRounds } from '$lib/utils/bracket-adapter';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { LiveConnection } from '$lib/stores/live.svelte';
	import { resolveDivision } from '$lib/utils/division-filter';
	import { cn } from '$lib/utils/cn';

	let {
		data
	}: {
		data: {
			tournament: PublicTournament;
			bracket: EventBracket | null;
			standings: Standing[] | null;
			groupKnockout: GroupKnockout | null;
			eventId: string | null;
			eventSlug: string | null;
			format: string;
			phase: 'group' | 'knockout';
			view: 'groups' | 'bracket' | 'players' | 'schedule';
			activeLabel: string | null;
			schedule: ScheduleSlot[];
			rosters: { event: EventDivision; participants: Participant[] }[];
		};
	} = $props();

	const events = $derived(data.tournament.events ?? []);
	const activeEvent = $derived(events.find((e) => e.id === data.eventId) ?? null);

	// Filter state is DERIVED from the active division, not carried in the URL.
	// Picking a category or gender selects a division, and the division IS the
	// URL — so there is nothing left for ?category=&gender= to express. That
	// removes the params rather than merely shortening them.
	const category = $derived(activeEvent?.category ?? null);
	const gender = $derived<EventGender | null>(activeEvent?.gender ?? null);
	// The server already snapped the phase to one this division has, so the
	// component no longer re-derives it from query params.
	type View = 'group' | 'knockout';
	const requestedView = $derived<View>(data.phase);

	const tournamentSlug = $derived(page.params.slug!);

	// --- shared-link metadata -------------------------------------------
	const viewLabel = $derived(
		data.view === 'players'
			? 'Players'
			: data.view === 'schedule'
				? 'Schedule'
				: data.view === 'groups'
					? 'Group standings'
					: 'Knockout bracket'
	);
	// players/schedule span every division, so naming one in the title would be
	// wrong — they lead with the view instead.
	const isTournamentWide = $derived(data.view === 'players' || data.view === 'schedule');
	const shareTitle = $derived(
		[isTournamentWide ? viewLabel : data.activeLabel, data.tournament.name]
			.filter(Boolean)
			.join(' — ') || data.tournament.name
	);
	// `sport` is stored lowercase ("tennis"); title-case it here rather than with
	// CSS, since a meta tag gets no styling.
	const sportLabel = $derived(
		data.tournament.sport
			? data.tournament.sport.charAt(0).toUpperCase() + data.tournament.sport.slice(1)
			: null
	);
	const shareDescription = $derived(
		[isTournamentWide ? null : viewLabel, sportLabel, data.tournament.location]
			.filter(Boolean)
			.join(' · ')
	);
	// page.url is absolute during SSR, so this resolves to a real origin rather
	// than a path fragment that scrapers would reject.
	const canonicalUrl = $derived(new URL(page.url.pathname, page.url.origin).href);

	// Share: the exact current public view (path + whitelisted filters),
	// canonicalized to the configured site origin. One dialog serves every
	// public surface this shell renders (bracket, standings, schedule, players).
	let shareOpen = $state(false);
	const currentShareUrl = $derived(shareUrl(page.url, SITE_BASE_URL));

	/** Canonical path for a division + phase. Mirrors divisionPath() on the
	 *  server; both exist because one runs per-navigation in the browser and the
	 *  other builds redirect targets during SSR. */
	function pathFor(divisionSlug: string | null, v: View) {
		if (!divisionSlug) return `/tournaments/${tournamentSlug}`;
		return `/tournaments/${tournamentSlug}/${divisionSlug}/${v === 'group' ? 'groups' : 'bracket'}`;
	}

	// Changing a filter navigates to the matching division. There is no separate
	// filter state to persist — the destination URL carries everything.
	// Resolution lives in $lib/utils/division-filter so it is unit-testable; see
	// the note there on why the untouched dimension has to be relaxed.
	function apply(next: { category?: string | null; gender?: EventGender | null; view?: View }) {
		const target =
			'category' in next || 'gender' in next
				? resolveDivision(events, activeEvent, next)
				: activeEvent;

		const dest = pathFor(target?.slug ?? null, next.view ?? requestedView);
		if (dest === page.url.pathname) return; // already there; skip a no-op navigation
		goto(dest, { noScroll: true, keepFocus: true });
	}

	// View switcher: both phases are ALWAYS shown; the one the active event lacks
	// is disabled (visible but not clickable) rather than hidden, so the control's
	// shape stays stable across divisions.
	const showGroup = $derived(activeEvent?.has_group_stage ?? false);
	const showKnockout = $derived(activeEvent?.has_knockout_stage ?? data.format !== 'round_robin');
	const viewTabs = $derived([
		{ v: 'group' as View, l: 'Group standings', disabled: !showGroup },
		{ v: 'knockout' as View, l: 'Knockout stage', disabled: !showKnockout }
	]);
	// Snap the requested view to a phase the event actually has, so we never
	// render (or highlight) a disabled tab.
	const view = $derived<View>(
		requestedView === 'group' && !showGroup
			? 'knockout'
			: requestedView === 'knockout' && !showKnockout
				? 'group'
				: requestedView
	);

	// --- Live refresh (SSE) ---
	let liveBracket = $state<EventBracket | null>(null);
	let liveStandings = $state<Standing[] | null>(null);
	let liveGK = $state<GroupKnockout | null>(null);
	let liveSchedule = $state<ScheduleSlot[] | null>(null);
	const bracket = $derived(liveBracket ?? data.bracket);
	const standings = $derived(liveStandings ?? data.standings);
	const groupKnockout = $derived(liveGK ?? data.groupKnockout);
	const schedule = $derived(liveSchedule ?? data.schedule);

	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const conn = new LiveConnection(data.tournament.slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});
	// Refetch on every event AND on every (re)connect: the stream replays
	// nothing, so a reconnect after a dropped connection must catch up on
	// whatever was missed. `generation` bumps once per successful connect.
	$effect(() => {
		const ev = live?.lastEvent;
		const gen = live?.generation ?? 0;
		const eventId = data.eventId;
		const fmt = data.format;
		if (gen === 0 && !ev) return; // nothing to catch up on before first connect
		if (ev?.name === 'schedule.updated' || data.view === 'schedule') {
			listPublicSchedule(data.tournament.slug).then((s) => (liveSchedule = s)).catch(() => {});
		}
		if (!eventId) return;
		if (fmt === 'round_robin') getEventStandings(eventId).then((s) => (liveStandings = s.standings)).catch(() => {});
		else if (fmt === 'group_knockout') getGroupKnockout(eventId).then((g) => (liveGK = g)).catch(() => {});
		else getEventBracket(eventId).then((b) => (liveBracket = b)).catch(() => {});
	});

	// Knockout bracket + final match. Both single_elim's bracket.rounds and
	// group_knockout's groupKnockout.knockout are already real elimination
	// trees (unlike round_robin's flat fixture list, which never reaches this
	// code — that format branches to <Standings> instead, above) — adaptable
	// directly, no synthetic EventBracket wrapper needed.
	const knockoutRounds = $derived(
		data.format === 'group_knockout' ? (groupKnockout?.knockout ?? []) : (bracket?.rounds ?? [])
	);
	const adaptedKnockoutRounds = $derived(adaptBracketRounds(knockoutRounds, data.tournament.timezone));
	const hasKnockout = $derived(knockoutRounds.some((r) => r.matches.length > 0));
</script>

<!-- Shared-link payload. This is what a WhatsApp / Slack / iMessage unfurl
     renders, and until now the page shipped no <title> and no og: tags at all,
     so a pasted link showed the bare URL and nothing else. Every value here is
     already in the loader — no extra round-trip.
     og:url is the CANONICAL path, so a link arriving on a legacy ?event=<uuid>
     URL still reports the clean one to anything that scrapes it. -->
<svelte:head>
	<title>{shareTitle}</title>
	<meta name="description" content={shareDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="tourney.social" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={shareDescription} />
	<meta property="og:url" content={canonicalUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={shareDescription} />
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

<!-- ============ HERO (centered, no header band) ============ -->
<section class="pt-16 pb-10 text-center sm:pt-24">
	<!-- One quiet eyebrow instead of two bordered badges — the landing's
	     language. The dot marks a published (live) event. -->
	<p
		class="mb-8 flex items-center justify-center gap-2.5 font-mono font-medium text-[11px] uppercase tracking-[0.22em] text-muted"
	>
		{data.tournament.sport}
		{#if data.tournament.status === 'published'}
			<span aria-hidden="true" class="text-border">·</span>
			<span class="inline-flex items-center gap-1.5 text-gold">
				<span class="size-1.5 rounded-full bg-gold animate-pulse motion-reduce:animate-none"></span>
				Live
			</span>
		{/if}
	</p>

	<!-- The board IS the title. The real <h1> is sr-only and the board is
	     aria-hidden, so the name is announced once as a heading instead of
	     twice (or, worse, only as a grid of dots). The division below stays
	     real visible text and reads normally after it. -->
	<h1 class="sr-only">{data.tournament.name}</h1>
	<LightBoard
		text={data.tournament.name}
		rows={9}
		lightSize={8}
		gap={3}
		aria-hidden="true"
		class="mx-auto max-w-5xl"
	/>

	{#if data.activeLabel && !isTournamentWide}
		<!-- Sans, not the Georgia display face. This is a label under a sign, and
		     it now sits beneath a rigid dot-matrix rather than a serif title —
		     a flowing serif was the odd voice out. Bold + wide tracking is the
		     idiom every other label in this app already uses (Badge, Tag,
		     Button, Field), so it reads as part of the system.
		     indent is HALF the tracking: letter-spacing adds a unit after every
		     character including the last, so the ink spans (box - 0.2em) and
		     its centre sits 0.1em left of the box centre. The board above is
		     pixel-centred, so that offset would show as a misalignment. -->
		<p
			class="vt-label mt-5 indent-[0.1em] font-body text-[clamp(1.125rem,2.6vw,1.75rem)] font-mono font-medium uppercase leading-tight tracking-[0.2em] text-balance text-accent"
		>
			{data.activeLabel}
		</p>
	{/if}

	{#if data.tournament.description}
		<p class="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
			{data.tournament.description}
		</p>
	{/if}
</section>

<!-- ============ TOURNAMENT NAV (Bracket / Schedule) — real <a> links, not a
     client-side tab switch: these are genuinely different pages (their own
     URL, their own loader), so back/forward and deep-linking need to work,
     which the ARIA-tabs pattern ($lib/components/ui/Tabs.svelte) isn't built
     for. "Bracket" points at whichever division + phase is currently active
     (falls back to the tournament's first division when there is none, e.g.
     when arriving from Schedule) rather than resetting it. ============ -->
<div class="relative mb-8 flex justify-center gap-6 border-b border-border">
	<a
		href={pathFor(activeEvent?.slug ?? null, requestedView)}
		class={cn(
			'-mb-px border-b-2 px-1 pb-3 text-[11px] font-mono font-medium uppercase tracking-[0.12em] transition-colors',
			isTournamentWide ? 'border-transparent text-muted hover:text-primary' : 'border-accent text-primary'
		)}
	>
		Bracket
	</a>
	<!-- Utility actions live in the nav rail: present on every public surface
	     without competing with content. Share carries the exact current view;
	     Present opens the fullscreen court display. -->
	<div class="absolute right-0 top-0 -mt-1 flex items-center gap-2">
		<a
			href="/tournaments/{tournamentSlug}/present"
			class="hidden items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-[11px] font-mono font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-primary sm:flex"
		>
			<MonitorPlay class="size-3.5" /> Present
		</a>
		<button
			type="button"
			onclick={() => (shareOpen = true)}
			aria-label="Share this view"
			class="flex items-center gap-1.5 rounded-pill border border-border p-2 text-[11px] font-mono font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-primary sm:px-3 sm:py-1.5"
		>
			<Share2 class="size-3.5" /><span class="hidden sm:inline">Share</span>
		</button>
	</div>
	<a
		href="/tournaments/{tournamentSlug}/schedule"
		class={cn(
			'-mb-px border-b-2 px-1 pb-3 text-[11px] font-mono font-medium uppercase tracking-[0.12em] transition-colors',
			data.view === 'schedule' ? 'border-accent text-primary' : 'border-transparent text-muted hover:text-primary'
		)}
	>
		Schedule
	</a>
</div>

<!-- Connection state: quiet while healthy, one calm line while catching up.
     Only shown after a working stream drops, never during first connect. -->
{#if live?.reconnecting}
	<p
		role="status"
		class="mx-auto -mt-4 mb-6 w-fit rounded-pill border border-border bg-surface px-3 py-1 text-[11px] text-muted"
	>
		Live updates paused — reconnecting…
	</p>
{/if}

{#if isTournamentWide}
	<div class="vt-content mx-auto max-w-3xl">
		{#if data.view === 'schedule'}
			<TournamentSchedule slots={schedule} timezone={data.tournament.timezone} />
		{:else}
			<EmptyState title="Player list coming soon" message="Rosters will appear here." />
		{/if}
	</div>
{:else}
	<!-- ============ FILTER CARD (category left, gender right) — self-hides when
	     there's nothing to filter (single/uncategorised division). Sits above the
	     view switcher: pick WHICH division first, then WHICH stage of it. ============ -->
	<TournamentFilterStrip {events} eventId={activeEvent?.id ?? null} card onchange={(next) => apply(next)} />

	<!-- ============ VIEW SWITCHER (centered pill) — both phases always shown;
	     the one this division lacks is disabled. Hidden only for round-robin
	     (no phases at all). ============ -->
	{#if data.format !== 'round_robin'}
		<div class="mb-8 flex justify-center">
			<SegmentedControl
				options={viewTabs.map((t) => ({ value: t.v, label: t.l, disabled: t.disabled }))}
				value={view}
				onchange={(v) => apply({ view: v as View })}
			/>
		</div>
	{/if}

	<!-- ============ VIEWS ============ -->
	<!-- vt-content: one region, cross-faded as a whole on division/view change
	     (layout.css) — not per-row, per-card. Table values and group cards are
	     data the user is reading; only the swap between two different divisions'
	     data dissolves, not the numbers themselves. -->
	<div class="vt-content">
		{#if !data.eventId}
			<EmptyState title="No divisions published" message="Published divisions will appear here." />
		{:else if data.format === 'round_robin'}
			<Standings standings={standings ?? []} />
		{:else if view === 'group'}
		{#if groupKnockout && groupKnockout.groups.length > 0}
			<div class="grid gap-5 md:grid-cols-2">
				{#each groupKnockout.groups as group (group.id)}
					<Card padded={false}>
						<div class="border-b border-border px-5 py-4">
							<div class="flex items-center gap-2">
								<span class="size-2 rounded-full bg-accent"></span>
								<h3 class="font-display text-[17px] tracking-[-0.01em] text-primary">{group.name}</h3>
							</div>
						</div>
						<div class="p-2">
							<Standings standings={group.standings} />
						</div>
						<p class="px-5 pb-3 text-right text-[11px] text-muted">
							Top {group.advance_count} advance to knockout
						</p>
					</Card>
				{/each}
			</div>
		{:else}
			<EmptyState title="Group stage not ready" message="Standings appear once the draw is generated." />
		{/if}
	{:else if hasKnockout}
		<!-- No theme wrapper needed: PagedKnockoutBracket's --bk-* fallbacks
		     point at the app's --color-* tokens, so every mount is themed.
		     Set --bk-* vars on a wrapper only to deliberately diverge. -->
		<PagedKnockoutBracket rounds={adaptedKnockoutRounds} />
	{:else}
		<EmptyState title="Draw not published yet" message="The bracket appears once the organizer generates the draw." />
	{/if}
</div>
{/if}

<ShareDialog bind:open={shareOpen} url={currentShareUrl} title={shareTitle} />
