<script lang="ts">
	import type { BracketMatch, BracketSlot } from '$lib/api/endpoints/events';
	import type { Court } from '$lib/api/endpoints/schedule';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
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
		courts
	}: {
		open: boolean;
		match: BracketMatch | null;
		tournamentId: string;
		courts: Court[];
	} = $props();

	function slot(n: number): BracketSlot | undefined {
		return match?.participants.find((p) => p.slot === n);
	}
	function name(n: number): string {
		return slot(n)?.display_name ?? slot(n)?.source_label ?? 'TBD';
	}
	// Both sides must hold a real participant before a match can be scored.
	const playable = $derived(!!slot(1)?.participant_id && !!slot(2)?.participant_id);

	const tone = (s: string) =>
		s === 'completed' ? 'published' : s === 'live' ? 'gold' : s === 'bye' ? 'archived' : 'draft';

	// Score set rows, seeded from any existing sets when the panel opens.
	let sets = $state<{ p1: string; p2: string }[]>([]);
	let court = $state('');
	let startsAt = $state('');
	let submitting = $state(false);

	// Re-seed the local form whenever a different match is opened.
	let seededFor = $state('');
	$effect(() => {
		if (match && match.id !== seededFor) {
			sets =
				match.sets?.length > 0
					? match.sets.map((s) => ({ p1: String(s.p1), p2: String(s.p2) }))
					: [{ p1: '', p2: '' }];
			court = '';
			startsAt = '';
			seededFor = match.id;
		}
	});

	function addSet() {
		sets = [...sets, { p1: '', p2: '' }];
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
					success: 'Schedule saved',
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
				<h4 class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Schedule</h4>
				<input type="hidden" name="tournament_id" value={tournamentId} />
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

			<!-- Score. Completing advances the winner (single_elim logic). -->
			{#if playable}
				<form
					method="POST"
					action="?/score"
					use:enhance={toastEnhance({
						success: (fd) => (fd.get('complete') === 'true' ? 'Match completed' : 'Score saved'),
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
					<h4 class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Score</h4>
					<input type="hidden" name="matchId" value={match.id} />
					<div class="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[13px]">
						<span></span>
						<span class="w-14 text-center text-[10px] font-bold uppercase text-muted">{name(1)}</span>
						<span class="w-14 text-center text-[10px] font-bold uppercase text-muted">{name(2)}</span>
						{#each sets as s, i (i)}
							<span class="text-muted">Set {i + 1}</span>
							<input
								name="p1_games"
								type="number"
								min="0"
								bind:value={s.p1}
								class="{inputClass} w-14 px-2 text-center"
							/>
							<div class="flex items-center gap-1">
								<input
									name="p2_games"
									type="number"
									min="0"
									bind:value={s.p2}
									class="{inputClass} w-14 px-2 text-center"
								/>
								{#if sets.length > 1}
									<button
										type="button"
										onclick={() => removeSet(i)}
										class="grid size-6 place-items-center rounded-pill text-muted hover:text-danger"
										aria-label="Remove set">×</button
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
					<div class="flex justify-end gap-2">
						<Button type="submit" name="complete" value="false" variant="subtle" disabled={submitting}>
							Save progress
						</Button>
						<Button type="submit" name="complete" value="true" disabled={submitting}>
							{submitting ? 'Saving…' : 'Complete match'}
						</Button>
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
