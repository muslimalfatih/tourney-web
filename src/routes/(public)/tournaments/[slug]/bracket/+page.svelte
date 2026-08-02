<script lang="ts">
	import type { PublicTournament, EventGender, EventDivision } from '$lib/api/types';
	import type { EventBracket, Standing, GroupKnockout } from '$lib/api/endpoints/events';
	import type { ScheduleSlot } from '$lib/api/endpoints/schedule';
	import type { Participant } from '$lib/api/endpoints/participants';
	import { getEventBracket, getEventStandings, getGroupKnockout } from '$lib/api/endpoints/events';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import TournamentFilterStrip from '$lib/components/public/TournamentFilterStrip.svelte';
	import PagedKnockoutBracket from '$lib/components/bracket/PagedKnockoutBracket.svelte';
	import MatchDetailModal from '$lib/components/bracket/MatchDetailModal.svelte';
	import { adaptBracketRounds } from '$lib/utils/bracket-adapter';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { LiveConnection } from '$lib/stores/live.svelte';

	let {
		data
	}: {
		data: {
			tournament: PublicTournament;
			bracket: EventBracket | null;
			standings: Standing[] | null;
			groupKnockout: GroupKnockout | null;
			eventId: string | null;
			format: string;
			phase: 'group' | 'knockout';
			activeLabel: string | null;
			schedule: ScheduleSlot[];
			rosters: { event: EventDivision; participants: Participant[] }[];
		};
	} = $props();

	const events = $derived(data.tournament.events ?? []);
	const activeEvent = $derived(events.find((e) => e.id === data.eventId) ?? null);

	// Filter + view state, all mirrored to the URL so links are shareable.
	const category = $derived(page.url.searchParams.get('category'));
	const gender = $derived(page.url.searchParams.get('gender') as EventGender | null);
	// View switcher: the phase toggle only (group standings ↔ knockout stage).
	type View = 'group' | 'knockout';
	// Requested view from the URL / server phase. Snapped to an available phase in
	// `view` below (declared after showGroup/showKnockout).
	const requestedView = $derived<View>(
		(page.url.searchParams.get('view') as View | null) ?? data.phase
	);

	function apply(next: {
		category?: string | null;
		gender?: EventGender | null;
		view?: View;
	}) {
		const qs = new URLSearchParams(page.url.searchParams);
		if ('category' in next) {
			next.category ? qs.set('category', next.category) : qs.delete('category');
			qs.delete('event');
		}
		if ('gender' in next) {
			next.gender ? qs.set('gender', next.gender) : qs.delete('gender');
			qs.delete('event');
		}
		if (next.view) {
			qs.set('view', next.view);
			// Keep the server's phase load in sync for group/knockout views.
			if (next.view === 'group' || next.view === 'knockout') qs.set('phase', next.view);
		}
		goto(`?${qs}`, { noScroll: true, keepFocus: true });
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
	const bracket = $derived(liveBracket ?? data.bracket);
	const standings = $derived(liveStandings ?? data.standings);
	const groupKnockout = $derived(liveGK ?? data.groupKnockout);

	let live = $state<LiveConnection | null>(null);
	$effect(() => {
		const conn = new LiveConnection(data.tournament.slug);
		live = conn;
		conn.start();
		return () => conn.stop();
	});
	$effect(() => {
		const ev = live?.lastEvent;
		const eventId = data.eventId;
		const fmt = data.format;
		if (!ev || !eventId) return;
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
	const adaptedKnockoutRounds = $derived(adaptBracketRounds(knockoutRounds));
	const hasKnockout = $derived(knockoutRounds.some((r) => r.matches.length > 0));

	// Clicking a match opens it in a popup instead of navigating to
	// /matches/[matchId] — that route stays reachable for direct/shared links,
	// it's just no longer how the bracket itself surfaces match detail. The
	// bracket's own BracketMatch (already in memory) carries court + round info
	// that the public match-detail endpoint doesn't return — passed into the
	// modal alongside the id so that shows immediately instead of waiting on
	// fields that would never arrive from the fetch.
	const knockoutMatchById = $derived(
		new Map(
			knockoutRounds.flatMap((r) => r.matches.map((m) => [m.id, { match: m, roundName: r.name }] as const))
		)
	);
	let detailOpen = $state(false);
	let detailMatchId = $state<string | null>(null);
	const detailBracketInfo = $derived(
		detailMatchId ? (knockoutMatchById.get(detailMatchId) ?? null) : null
	);
	function openMatchDetail(id: string) {
		detailMatchId = id;
		detailOpen = true;
	}
</script>

<!-- ============ HERO (centered, no header band) ============ -->
<section class="pt-16 pb-10 text-center sm:pt-24">
	<div class="mb-5 flex justify-center gap-2">
		<Badge tone="gold">{data.tournament.sport}</Badge>
		{#if data.tournament.status === 'published'}<Badge tone="accent">Live event</Badge>{/if}
	</div>
	<h1 class="font-display uppercase leading-[0.95] tracking-[-0.02em] text-primary text-[clamp(2.25rem,6vw,4.5rem)]">
		{data.tournament.name}
		{#if data.activeLabel}
			<span class="block text-accent">{data.activeLabel}</span>
		{/if}
	</h1>
	{#if data.tournament.description}
		<p class="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
			{data.tournament.description}
		</p>
	{/if}
</section>

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

<!-- ============ FILTER CARD (category left, gender right) — self-hides when
     there's nothing to filter (single/uncategorised division) ============ -->
<TournamentFilterStrip {events} {category} {gender} card onchange={(next) => apply(next)} />

<!-- ============ VIEWS ============ -->
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
							<h3 class="font-display text-[16px] uppercase tracking-[0.04em] text-primary">{group.name}</h3>
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
	<!-- PagedKnockoutBracket ships dark fallback colors (built alongside the
	     /bracket-demo prototype, which stays dark on purpose) — every color it
	     uses reads through a --bk-* custom property first, so this wrapper
	     re-themes it to Laga Burgundy for this page only, without touching the
	     shared component files or the demo. Sizing vars (--bk-card-w etc.) are
	     left alone; those come from the component's own responsive JS. -->
	<div
		style:--bk-bg="var(--color-page)"
		style:--bk-text="var(--color-primary)"
		style:--bk-muted="var(--color-muted)"
		style:--bk-accent="var(--color-accent)"
		style:--bk-winner="var(--color-accent)"
		style:--bk-gold="var(--color-gold)"
		style:--bk-header="var(--color-muted)"
		style:--bk-card-bg="var(--color-surface)"
		style:--bk-card-border="var(--color-border)"
		style:--bk-meta-bg="var(--color-subtle)"
		style:--bk-connector="var(--color-border)"
		style:--bk-nav-hover="var(--color-subtle)"
	>
		<PagedKnockoutBracket rounds={adaptedKnockoutRounds} onMatchClick={openMatchDetail} />
	</div>
{:else}
	<EmptyState title="Draw not published yet" message="The bracket appears once the organizer generates the draw." />
{/if}

<MatchDetailModal bind:open={detailOpen} matchId={detailMatchId} bracketInfo={detailBracketInfo} />
