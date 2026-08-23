<script lang="ts">
	import type { BracketMatch, BracketSlot } from '$lib/api/endpoints/events';
	import type { Court } from '$lib/api/endpoints/schedule';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import { zonedDayLabel, zonedTime } from '$lib/utils/tz';
	import { scoreSuccessMessage } from '$lib/utils/score-errors';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import DateTimePicker from '$lib/components/ui/DateTimePicker.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { inputClass } from '$lib/utils/ui';

	let {
		open = $bindable(false),
		match,
		tournamentId,
		courts,
		timezone = ''
	}: {
		open: boolean;
		match: BracketMatch | null;
		tournamentId: string;
		courts: Court[];
		// Tournament IANA zone — display hint for conflict messages only.
		timezone?: string;
	} = $props();

	function slot(n: number): BracketSlot | undefined {
		return match?.participants.find((p) => p.slot === n);
	}
	function name(n: number): string {
		return slot(n)?.display_name ?? slot(n)?.source_label ?? 'TBD';
	}
	// Both sides must hold a real participant before a match can be scored.
	const playable = $derived(!!slot(1)?.participant_id && !!slot(2)?.participant_id);
	const isCompleted = $derived(match?.status === 'completed');
	// Special-ending controls (walkover / retired / cancelled).
	let ending = $state('');
	let winnerSlot = $state('');

	const tone = (s: string) =>
		s === 'completed' ? 'published' : s === 'live' ? 'gold' : s === 'bye' ? 'archived' : 'draft';

	// Score set rows, seeded from any existing sets when the panel opens.
	let sets = $state<{ p1: string; p2: string; tb1: string; tb2: string }[]>([]);
	let court = $state('');
	let startsAt = $state('');
	let submitting = $state(false);

	// Re-seed the local form when a different match opens OR when the same match's
	// persisted data changes (after a save → invalidateAll brings fresh sets/
	// status/court/time). Keyed on a snapshot so mid-edit typing doesn't retrigger.
	const seedKey = $derived(
		match
			? `${match.id}:${match.status}:${match.court_id}:${match.scheduled_at}:${JSON.stringify(match.sets ?? [])}`
			: ''
	);
	let seededFor = $state('');
	$effect(() => {
		if (match && seedKey !== seededFor) {
			sets =
				match.sets?.length > 0
					? match.sets.map((s) => ({
							p1: String(s.p1),
							p2: String(s.p2),
							tb1: s.tb1 != null ? String(s.tb1) : '',
							tb2: s.tb2 != null ? String(s.tb2) : ''
						}))
					: [{ p1: '', p2: '', tb1: '', tb2: '' }];
			// Seed court + start from the persisted match so the panel shows what's
			// already scheduled instead of blank.
			court = match.court_id ?? '';
			startsAt = match.scheduled_at ?? '';
			seededFor = seedKey;
		}
	});

	function addSet() {
		sets = [...sets, { p1: '', p2: '', tb1: '', tb2: '' }];
	}
	function removeSet(i: number) {
		sets = sets.filter((_, idx) => idx !== i);
	}
</script>

{#if match}
	<Modal bind:open title="Match {match.match_no}" description="{name(1)} vs {name(2)}">
		<div class="flex flex-col gap-5">
			<div class="flex items-center gap-2">
				<Tag tone={tone(match.status)}>{match.status}</Tag>
				{#if playable && match.status !== 'live' && match.status !== 'completed'}
					<form
						method="POST"
						action="?/markLive"
						use:enhance={toastEnhance({
							success: 'Match started',
							error: 'Could not start the match.'
						})}
					>
						<input type="hidden" name="matchId" value={match.id} />
						<Button type="submit" variant="ghost" size="sm">Start match</Button>
					</form>
				{/if}
			</div>

			<!-- Schedule: court + start time. Editing here stamps the match via a
			     schedule slot; pairings are never editable from the bracket. -->
			<form
				method="POST"
				action="?/schedule"
				use:enhance={toastEnhance({
					success: (fd) => {
						const at = String(fd.get('starts_at') ?? '');
						const when = at ? `${zonedDayLabel(at, timezone, 'short')}, ${zonedTime(at, timezone)}` : '';
						return `Schedule saved${when ? ` — ${when}` : ''}`;
					},
					error: 'Could not save the schedule.',
					before: () => {
						submitting = true;
					},
					settle: () => {
						submitting = false;
					}
				})}
				class="flex flex-col gap-3 border-t border-border pt-4"
			>
				<h4 class="text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">Schedule</h4>
				<input type="hidden" name="tournament_id" value={tournamentId} />
				<input type="hidden" name="tz" value={timezone} />
				<input type="hidden" name="match_id" value={match.id} />
				<!-- bits-ui fields aren't native inputs; the picker writes an ISO
				     string into `startsAt`, forwarded to the action via this hidden field. -->
				<input type="hidden" name="starts_at" value={startsAt} />
				<Field label="Court">
					<Select
						name="court_id"
						bind:value={court}
						placeholder="— none —"
						items={courts.map((c) => ({ value: c.id, label: c.name }))}
					/>
				</Field>
				<Field label="Start">
					<DateTimePicker bind:value={startsAt} />
				</Field>
				<div class="flex justify-end">
					<Button type="submit" variant="subtle" size="sm" disabled={submitting || !court || !startsAt}>
						Save schedule
					</Button>
				</div>
			</form>

			<!-- Score. Completing advances the winner (single_elim logic). On success
			     the panel closes — the organizer sees the updated bracket behind it;
			     re-clicking the match reopens to correct a wrong score. -->
			{#if playable}
				<form
					method="POST"
					action="?/score"
					use:enhance={toastEnhance({
						success: (fd) =>
							fd.get('completion') === 'normal'
								? 'Match completed'
								: fd.get('completion') === 'incomplete'
									? 'Score saved'
									: 'Result recorded',
						error: 'Could not save the score.',
						before: () => {
							submitting = true;
						},
						onSuccess: () => {
							open = false;
						},
						settle: () => {
							submitting = false;
						}
					})}
					class="flex flex-col gap-3 border-t border-border pt-4"
				>
					<div class="flex items-center justify-between">
						<h4 class="text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">Score</h4>
						{#if isCompleted}
							<span class="text-[11px] text-muted">Completed — edit to correct</span>
						{/if}
					</div>
					<input type="hidden" name="matchId" value={match.id} />
					<div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-[13px]">
						<span></span>
						<span class="w-14 text-center text-[10px] font-mono font-medium uppercase text-muted">{name(1)}</span>
						<span class="w-14 text-center text-[10px] font-mono font-medium uppercase text-muted">{name(2)}</span>
						<span class="text-center text-[10px] font-mono font-medium uppercase text-muted">TB</span>
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
								<!-- Tiebreak points, required by the API for a 7-6 set. Empty
								     strings are dropped by the action, so untouched fields are
								     simply "no tiebreak". -->
								<input
									name="tiebreak_a"
									type="number"
									min="0"
									placeholder="–"
									bind:value={s.tb1}
									class="{inputClass} w-12 px-1 text-center"
									aria-label="Set {i + 1} tiebreak, {name(1)}"
								/>
								<input
									name="tiebreak_b"
									type="number"
									min="0"
									placeholder="–"
									bind:value={s.tb2}
									class="{inputClass} w-12 px-1 text-center"
									aria-label="Set {i + 1} tiebreak, {name(2)}"
								/>
								{#if sets.length > 1}
									<button
										type="button"
										onclick={() => removeSet(i)}
										class="grid size-8 place-items-center rounded-pill text-muted hover:text-danger"
										aria-label="Remove set">×</button
									>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Special endings: walkover records no play, retired keeps the
					     partial score — both need the winner named explicitly. -->
					<div class="flex flex-wrap items-center gap-3 text-[12px]">
						<label class="text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted" for="ending-{match.id}">Ending</label>
						<select id="ending-{match.id}" name="ending" bind:value={ending} class="{inputClass} w-auto px-2 py-1">
							<option value="">Played result</option>
							<option value="walkover">Walkover</option>
							<option value="retired">Retired</option>
							<option value="cancelled">Cancelled</option>
						</select>
						{#if ending === 'walkover' || ending === 'retired'}
							<span class="text-muted">Winner:</span>
							<label class="flex items-center gap-1"
								><input type="radio" name="winner_slot" value="1" bind:group={winnerSlot} /> {name(1)}</label
							>
							<label class="flex items-center gap-1"
								><input type="radio" name="winner_slot" value="2" bind:group={winnerSlot} /> {name(2)}</label
							>
						{/if}
					</div>
					<button
						type="button"
						onclick={addSet}
						class="self-start text-[11px] font-mono font-medium uppercase tracking-[0.12em] text-accent hover:text-accent-hover"
						>+ Add set</button
					>
					<div class="flex justify-end gap-2">
						{#if ending === ''}
							<Button type="submit" name="completion" value="incomplete" variant="subtle" disabled={submitting}>
								Save progress
							</Button>
							<Button type="submit" name="completion" value="normal" disabled={submitting}>
								{submitting ? 'Saving…' : isCompleted ? 'Update result' : 'Complete match'}
							</Button>
						{:else}
							<Button
								type="submit"
								name="completion"
								value={ending}
								disabled={submitting || ((ending === 'walkover' || ending === 'retired') && !winnerSlot)}
							>
								{submitting ? 'Saving…' : 'Record ' + ending}
							</Button>
						{/if}
					</div>
				</form>
			{:else}
				<p class="border-t border-border pt-4 text-[13px] text-muted">
					Both sides must be decided before a score can be entered.
				</p>
			{/if}
		</div>
	</Modal>
{/if}
