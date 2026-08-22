<script lang="ts">
	import type { MatchDetail, MatchSlot } from '$lib/api/endpoints/matches';
	import type { BracketMatch } from '$lib/api/endpoints/events';
	import { getMatch } from '$lib/api/endpoints/matches';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { MapPin, Clock, CalendarDays } from '@lucide/svelte';
	import { cn } from '$lib/utils/cn';

	// Popup version of the standalone match-detail route (matches/[matchId]) —
	// same content, but opened over the bracket instead of navigating away from
	// it. Fetches once when `matchId` is set; no live SSE subscription (the
	// bracket page behind it already live-updates its own cards, and reopening
	// the popup re-fetches, so this stays deliberately simple).
	let {
		matchId,
		// Round name + the bracket's own BracketMatch, already in memory on the
		// bracket page — carries court_id/court_name/scheduled_at, which the
		// public match-detail endpoint (getMatch, below) does NOT return. Shown
		// immediately (no loading wait) while the fetch fills in the rest
		// (started/completed timestamps, tiebreaks) that the bracket data lacks.
		bracketInfo = null,
		open = $bindable(false)
	}: {
		matchId: string | null;
		bracketInfo?: { match: BracketMatch; roundName: string } | null;
		open?: boolean;
	} = $props();

	let match = $state<MatchDetail | null>(null);
	let loadError = $state<string | null>(null);
	let loading = $state(false);

	// Re-fetch whenever a different match id is opened. Guarded so closing (id
	// still set, open=false) doesn't retrigger, and so a stale response from a
	// previous id can't clobber a newer one if the user clicks through quickly.
	let loadedFor = $state<string | null>(null);
	$effect(() => {
		if (!open || !matchId || matchId === loadedFor) return;
		const id = matchId;
		loading = true;
		loadError = null;
		match = null;
		getMatch(id)
			.then((m) => {
				if (id !== matchId) return; // superseded by a newer click
				match = m;
				loadedFor = id;
			})
			.catch(() => {
				if (id !== matchId) return;
				loadError = 'Could not load this match.';
			})
			.finally(() => {
				if (id === matchId) loading = false;
			});
	});
	// Forget the cached match once closed, so reopening the SAME id fetches
	// fresh data instead of showing what could now be stale.
	$effect(() => {
		if (!open) loadedFor = null;
	});

	function slot(n: number): MatchSlot | undefined {
		return match?.participants?.find((p) => p.slot === n);
	}
	function isWinner(n: number): boolean {
		const s = slot(n);
		return !!s?.participant_id && s.participant_id === match?.winner_participant_id;
	}
	const tone = (s: string) =>
		s === 'completed' ? 'published' : s === 'live' ? 'gold' : s === 'bye' ? 'archived' : 'draft';

	const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	function fmtDateTime(iso: string | null | undefined): string | null {
		if (!iso) return null;
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? null : dateTimeFmt.format(d);
	}

	const court = $derived(bracketInfo?.match.court_name ?? null);
	const scheduledAt = $derived(fmtDateTime(bracketInfo?.match.scheduled_at ?? match?.scheduled_at));
	const startedAt = $derived(fmtDateTime(match?.started_at));
	const completedAt = $derived(fmtDateTime(match?.completed_at));
</script>

<Modal
	bind:open
	title={bracketInfo ? `${bracketInfo.roundName} · Match ${bracketInfo.match.match_no}` : match ? `Match ${match.match_no}` : 'Match'}
>
	{#if loading}
		<p class="py-8 text-center text-sm text-muted">Loading…</p>
	{:else if loadError}
		<p class="py-8 text-center text-sm text-danger">{loadError}</p>
	{:else if match}
		<div class="mb-4 flex items-center gap-3">
			<Tag tone={tone(match.status)}>{match.status}</Tag>
			{#if match.status === 'live'}
				<span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
					<span class="size-1.5 animate-pulse rounded-full bg-gold"></span> Live
				</span>
			{/if}
		</div>

		<!-- Court + schedule — the important logistics info a spectator actually
		     needs to go find/watch the match, shown before the score. -->
		{#if court || scheduledAt}
			<div class="mb-4 flex flex-col gap-1.5 text-[13px] text-muted">
				{#if court}
					<span class="flex items-center gap-2">
						<MapPin class="size-3.5 shrink-0" aria-hidden="true" />
						{court}
					</span>
				{/if}
				{#if scheduledAt}
					<span class="flex items-center gap-2">
						<CalendarDays class="size-3.5 shrink-0" aria-hidden="true" />
						{scheduledAt}
					</span>
				{/if}
			</div>
		{/if}

		<Card padded={false}>
			{#each [1, 2] as n (n)}
				<div class="flex items-center gap-3 px-5 py-4 {n === 2 ? 'border-t border-border' : ''}">
					{#if slot(n)?.seed != null}
						<span
							class="grid size-6 shrink-0 place-items-center rounded-full border border-gold text-[11px] font-bold text-gold"
							>{slot(n)?.seed}</span
						>
					{/if}
					<span class={cn('flex-1 text-[15px]', isWinner(n) ? 'font-bold text-accent' : 'text-primary')}>
						{slot(n)?.display_name ?? 'TBD'}
					</span>
					<span class="flex shrink-0 items-center gap-2 font-display text-[15px] tabular-nums">
						{#each match.sets ?? [] as s (s.set_number)}
							<span class={isWinner(n) ? 'text-accent' : 'text-muted'}>
								{n === 1 ? s.games_a : s.games_b}{#if n === 1 ? s.tiebreak_a != null : s.tiebreak_b != null}<sup
										class="text-[10px]">{n === 1 ? s.tiebreak_a : s.tiebreak_b}</sup
									>{/if}
							</span>
						{/each}
					</span>
				</div>
			{/each}
		</Card>

		<!-- Started/completed timestamps — secondary timing detail, only shown
		     once there's something to say (a match that hasn't started has
		     neither). -->
		{#if startedAt || completedAt}
			<div class="mt-4 flex flex-col gap-1 text-[12px] text-muted">
				{#if startedAt}
					<span class="flex items-center gap-2">
						<Clock class="size-3.5 shrink-0" aria-hidden="true" />
						Started {startedAt}
					</span>
				{/if}
				{#if completedAt}
					<span class="flex items-center gap-2">
						<Clock class="size-3.5 shrink-0" aria-hidden="true" />
						Completed {completedAt}
					</span>
				{/if}
			</div>
		{/if}
	{/if}
</Modal>
