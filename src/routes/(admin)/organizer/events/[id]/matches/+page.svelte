<script lang="ts">
	import type { EventRow } from '$lib/api/endpoints/events';
	import type { MatchDetail, MatchSlot } from '$lib/api/endpoints/matches';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { scoreSuccessMessage } from '$lib/utils/score-errors';

	let {
		data,
		form
	}: { data: { event: EventRow; matches: MatchDetail[] }; form?: { error?: string } } = $props();

	// Score modal state. Sets carry optional tiebreak points (a 7-6 set is only
	// legal with them — the server enforces it; the inputs just make it possible).
	let scoreOpen = $state(false);
	let active = $state<MatchDetail | null>(null);
	let sets = $state<{ p1: string; p2: string; tb1: string; tb2: string }[]>([]);
	let submitting = $state(false);
	// Ending: how the match concluded. "normal" derives the winner from the
	// sets; walkover/retired need the organizer to name the winner; cancelled
	// voids the fixture (no winner, excluded from standings).
	let ending = $state<'normal' | 'walkover' | 'retired' | 'cancelled'>('normal');
	let winnerSlot = $state(0);
	const needsWinner = $derived(ending === 'walkover' || ending === 'retired');
	const showSets = $derived(ending !== 'walkover' && ending !== 'cancelled');

	function slot(m: MatchDetail, n: number): MatchSlot | undefined {
		return m.participants?.find((p) => p.slot === n);
	}
	function name(m: MatchDetail, n: number): string {
		return slot(m, n)?.display_name ?? 'TBD';
	}
	function isWinner(m: MatchDetail, n: number): boolean {
		const s = slot(m, n);
		return !!s?.participant_id && s.participant_id === m.winner_participant_id;
	}
	function scoreStr(m: MatchDetail, n: number): string {
		if (!m.sets?.length) return '';
		return m.sets.map((s) => (n === 1 ? s.games_a : s.games_b)).join(' ');
	}
	// A match is playable only when both slots have a participant.
	function playable(m: MatchDetail): boolean {
		return !!slot(m, 1)?.participant_id && !!slot(m, 2)?.participant_id;
	}
	// Decided endings (any of the four) are corrected via Edit, never Mark live.
	const decided = (s: string) => ['completed', 'walkover', 'retired', 'cancelled'].includes(s);

	// Decided endings share the "done" tone; cancelled reads as voided.
	const tone = (s: string) =>
		s === 'completed' || s === 'walkover' || s === 'retired'
			? 'published'
			: s === 'live'
				? 'gold'
				: s === 'bye' || s === 'cancelled'
					? 'archived'
					: 'draft';

	function openScore(m: MatchDetail) {
		active = m;
		sets =
			m.sets?.length > 0
				? m.sets.map((s) => ({
						p1: String(s.games_a),
						p2: String(s.games_b),
						tb1: s.tiebreak_a != null ? String(s.tiebreak_a) : '',
						tb2: s.tiebreak_b != null ? String(s.tiebreak_b) : ''
					}))
				: [{ p1: '', p2: '', tb1: '', tb2: '' }];
		ending = 'normal';
		winnerSlot = 0;
		scoreOpen = true;
	}
	function addSet() {
		sets = [...sets, { p1: '', p2: '', tb1: '', tb2: '' }];
	}
	function removeSet(i: number) {
		sets = sets.filter((_, idx) => idx !== i);
	}
</script>

<div class="mb-6">
	<a
		href="/organizer/events/{data.event.id}"
		class="text-sm text-muted transition-colors hover:text-primary">← Event</a
	>
	<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">
		{data.event.name} — Matches
	</h1>
	<p class="text-xs text-muted">Enter scores. Completing a match advances the winner.</p>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
		{form.error}
	</p>
{/if}

{#if data.matches.length === 0}
	<EmptyState title="No matches yet" message="Generate the draw first, then scores appear here." />
{:else}
	<div class="space-y-3">
		{#each data.matches as m (m.id)}
			<Card padded={false}>
				<div class="flex items-center gap-4 px-4 py-3">
					<span class="w-14 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
						>Match {m.match_no}</span
					>
					<!-- two rows of names + scores -->
					<div class="min-w-0 flex-1">
						{#each [1, 2] as n (n)}
							<div class="flex items-center justify-between gap-2 py-0.5">
								<span
									class="truncate text-[13px] {isWinner(m, n)
										? 'font-bold text-accent'
										: m.participants.find((p) => p.slot === n)?.display_name
											? 'text-primary'
											: 'text-muted'}">{name(m, n)}</span
								>
								<span class="shrink-0 font-display text-[13px] tabular-nums text-muted"
									>{scoreStr(m, n)}</span
								>
							</div>
						{/each}
					</div>
					{#if m.status === 'live'}
						<span
							class="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-danger/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-danger"
						>
							<span class="size-1.5 animate-pulse rounded-full bg-danger motion-reduce:animate-none"
							></span>
							Live
						</span>
					{:else}
						<Tag tone={tone(m.status)} class="shrink-0">{m.status}</Tag>
					{/if}
					<div class="flex shrink-0 gap-1">
						{#if playable(m) && !decided(m.status)}
							{#if m.status !== 'live'}
								<!-- One-click Mark live quick action on pending, playable rows. -->
								<form
									method="POST"
									action="?/markLive"
									use:enhance={toastEnhance({ success: 'Match started' })}
								>
									<input type="hidden" name="matchId" value={m.id} />
									<Button type="submit" variant="ghost" size="sm">
										<span class="mr-1 inline-block size-1.5 rounded-full bg-danger align-middle"></span>
										Mark live
									</Button>
								</form>
							{/if}
							<Button variant="ghost" size="sm" onclick={() => openScore(m)}>Score</Button>
						{:else if decided(m.status)}
							<Button variant="ghost" size="sm" onclick={() => openScore(m)}>Edit</Button>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<!-- Score entry modal -->
{#if active}
	<Modal
		bind:open={scoreOpen}
		title="Enter score"
		description="{name(active, 1)} vs {name(active, 2)}"
	>
		<form
			method="POST"
			action="?/score"
			use:enhance={toastEnhance({
				success: (fd) => scoreSuccessMessage(String(fd.get('completion') ?? '')),
				before: () => {
					submitting = true;
				},
				onSuccess: () => {
					scoreOpen = false;
				},
				settle: () => {
					submitting = false;
				}
			})}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="matchId" value={active.id} />

			{#if showSets}
				<div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-[13px]">
					<span class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Set</span>
					<span class="w-14 truncate text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
						>{name(active, 1).split(' ')[0]}</span
					>
					<span class="w-14 truncate text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
						>{name(active, 2).split(' ')[0]}</span
					>
					<span class="w-20 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
						>Tiebreak</span
					>
					{#each sets as s, i (i)}
						<span class="text-muted">Set {i + 1}</span>
						<input
							name="games_a"
							type="number"
							min="0"
							bind:value={s.p1}
							class="{inputClass} w-14 px-2 text-center"
						/>
						<input
							name="games_b"
							type="number"
							min="0"
							bind:value={s.p2}
							class="{inputClass} w-14 px-2 text-center"
						/>
						<div class="flex items-center gap-1">
							<input
								name="tiebreak_a"
								type="number"
								min="0"
								bind:value={s.tb1}
								placeholder="–"
								aria-label="Set {i + 1} tiebreak, first side"
								class="{inputClass} w-9 px-1 text-center"
							/>
							<input
								name="tiebreak_b"
								type="number"
								min="0"
								bind:value={s.tb2}
								placeholder="–"
								aria-label="Set {i + 1} tiebreak, second side"
								class="{inputClass} w-9 px-1 text-center"
							/>
							{#if sets.length > 1}
								<button
									type="button"
									onclick={() => removeSet(i)}
									class="grid size-8 place-items-center rounded-pill text-muted hover:text-danger"
									aria-label="Remove set {i + 1}">×</button
								>
							{/if}
						</div>
					{/each}
				</div>

				<button
					type="button"
					onclick={addSet}
					class="self-start text-[11px] font-bold uppercase tracking-[0.12em] text-accent hover:text-accent-hover"
					>+ Add set</button
				>
				<p class="text-[11px] text-muted">A 7-6 set needs its tiebreak points (e.g. 7-3).</p>
			{/if}

			<!-- Ending: played result vs the special conclusions. -->
			<div class="flex flex-col gap-2">
				<label
					for="rr-ending"
					class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Ending</label
				>
				<select id="rr-ending" bind:value={ending} class="{inputClass} w-full">
					<option value="normal">Played result</option>
					<option value="walkover">Walkover (opponent absent)</option>
					<option value="retired">Retired mid-match</option>
					<option value="cancelled">Cancelled (does not count)</option>
				</select>
			</div>

			{#if needsWinner}
				<fieldset class="flex flex-col gap-2">
					<legend class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
						Winner
					</legend>
					{#each [1, 2] as n (n)}
						<label class="flex items-center gap-2 text-[13px] text-primary">
							<input type="radio" name="winner_slot" value={n} bind:group={winnerSlot} />
							{name(active, n)}
						</label>
					{/each}
				</fieldset>
			{/if}

			<div class="mt-2 flex justify-end gap-2">
				<Button type="button" variant="ghost" onclick={() => (scoreOpen = false)}>Cancel</Button>
				{#if ending === 'normal'}
					<Button
						type="submit"
						name="completion"
						value="incomplete"
						variant="subtle"
						disabled={submitting}>Save progress</Button
					>
					<Button type="submit" name="completion" value="normal" disabled={submitting}
						>{submitting ? 'Saving…' : 'Complete match'}</Button
					>
				{:else}
					<Button
						type="submit"
						name="completion"
						value={ending}
						disabled={submitting || (needsWinner && !winnerSlot)}
						>{submitting ? 'Saving…' : `Record ${ending}`}</Button
					>
				{/if}
			</div>
		</form>
	</Modal>
{/if}
