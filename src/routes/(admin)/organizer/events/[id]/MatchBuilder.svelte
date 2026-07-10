<script lang="ts">
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { EventBracket } from '$lib/api/endpoints/events';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Eraser, Search, ArrowRight } from '@lucide/svelte';

	let {
		participants,
		hasDraw,
		entryNoun,
		bracket = null
	}: {
		participants: Participant[];
		hasDraw: boolean;
		entryNoun: string;
		// Existing draw, if any — used to prefill round-1 pairs on edit.
		bracket?: EventBracket | null;
	} = $props();

	// --- Manual pairings model -------------------------------------------------
	// Round 1 has (nextPowerOfTwo(n) / 2) matches; each match holds two slots,
	// each either a participant id or null (empty). A participant id may appear in
	// at most one slot — the selects enforce this by offering only free teams.
	type Slot = string | null;
	type MatchRow = { a: Slot; b: Slot };

	function nextPow2(n: number): number {
		let p = 1;
		while (p < n) p <<= 1;
		return p;
	}
	const roundOneCount = $derived(participants.length < 2 ? 0 : nextPow2(participants.length) / 2);

	// Existing round-1 pairs keyed by match index, from the current draw. Only
	// participant slots (not source labels) — round 1 always has real teams.
	function existingRows(): MatchRow[] {
		const r1 = bracket?.rounds?.[0]?.matches ?? [];
		return r1.map((m) => ({
			a: m.participants.find((p) => p.slot === 1)?.participant_id ?? null,
			b: m.participants.find((p) => p.slot === 2)?.participant_id ?? null
		}));
	}

	// The editable grid. Re-seeded whenever the source data changes: the match
	// count (a participant was added/removed) OR the existing draw's round-1 pairs
	// (a rebuild → invalidateAll brought fresh data). Keyed on a snapshot so an
	// in-progress edit to `rows` doesn't retrigger a re-seed. Prefills from the
	// existing draw when its round-1 size matches; otherwise blank.
	const seedKey = $derived(
		JSON.stringify({
			n: roundOneCount,
			r1: bracket?.rounds?.[0]?.matches?.map((m) => [
				m.participants.find((p) => p.slot === 1)?.participant_id ?? null,
				m.participants.find((p) => p.slot === 2)?.participant_id ?? null
			]) ?? null
		})
	);
	let rows = $state<MatchRow[]>([]);
	let builtFor = $state('');
	$effect(() => {
		if (seedKey !== builtFor) {
			const prior = existingRows();
			rows =
				prior.length === roundOneCount && roundOneCount > 0
					? prior
					: Array.from({ length: roundOneCount }, () => ({ a: null, b: null }));
			builtFor = seedKey;
		}
	});

	const byId = $derived(new Map(participants.map((p) => [p.id, p] as const)));
	const assigned = $derived(
		new Set(rows.flatMap((r) => [r.a, r.b]).filter((v): v is string => v !== null))
	);
	const unassigned = $derived(participants.filter((p) => !assigned.has(p.id)));

	let search = $state('');
	const unassignedFiltered = $derived(
		unassigned.filter((p) => p.display_name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	// Options for a given slot = all participants NOT assigned elsewhere, plus the
	// one currently in this slot (so it stays selectable/visible). Returned as
	// Select items with a leading "empty" choice ('' maps to null in the model).
	function optionsFor(current: Slot): { value: string; label: string }[] {
		const free = participants.filter((p) => !assigned.has(p.id) || p.id === current);
		return [{ value: '', label: '— empty —' }, ...free.map((p) => ({ value: p.id, label: p.display_name }))];
	}

	// --- Validation ------------------------------------------------------------
	// A row is half-filled if exactly one side is set — not allowed on save.
	const halfFilled = $derived(rows.filter((r) => (r.a === null) !== (r.b === null)).length);
	const filledRows = $derived(rows.filter((r) => r.a !== null || r.b !== null).length);
	const canSaveManual = $derived(halfFilled === 0 && filledRows > 0);

	// --- Actions ---------------------------------------------------------------
	function clearPairings() {
		rows = rows.map(() => ({ a: null, b: null }));
	}

	// Serialize to the payload the `build` action expects.
	const manualPayload = $derived(
		JSON.stringify(
			rows
				.filter((r) => r.a !== null || r.b !== null)
				.map((r) => ({ team_a_id: r.a, team_b_id: r.b }))
		)
	);

	let submitting = $state(false);
	let confirmOpen = $state(false);

	// Trigger the hidden manual-build form (goes through use:enhance).
	function submitBuild() {
		(document.getElementById('buildManualForm') as HTMLFormElement | null)?.requestSubmit();
	}
	function onSaveClick() {
		if (hasDraw) confirmOpen = true;
		else submitBuild();
	}
</script>

<div class="flex flex-col gap-5">
	{#if participants.length < 2}
		<Card>
			<p class="text-sm text-muted">
				Add at least 2 {entryNoun}s in the Participants tab before building a bracket.
			</p>
		</Card>
	{:else}
		<!-- Manual round-1 pairings: unassigned list + round-1 editor -->
		<div class="grid gap-5 lg:grid-cols-[18rem_1fr]">
			<!-- Unassigned teams -->
			<Card padded={false} class="h-max">
				<div class="border-b border-border px-4 py-3">
					<h3 class="font-display text-[13px] uppercase tracking-[0.08em] text-primary">
						Unassigned
					</h3>
					<p class="text-xs text-muted">
						{unassigned.length} {entryNoun}{unassigned.length === 1 ? '' : 's'} not yet paired
					</p>
				</div>
				<div class="border-b border-border px-4 py-2">
					<div class="relative">
						<Search
							class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
						/>
						<input
							bind:value={search}
							placeholder="Search {entryNoun}s"
							class="{inputClass} h-8 pl-8 text-[12px]"
						/>
					</div>
				</div>
				<div class="max-h-[22rem] overflow-y-auto p-2">
					{#if unassignedFiltered.length === 0}
						<p class="px-2 py-6 text-center text-xs text-muted">
							{unassigned.length === 0 ? 'Everyone is paired.' : 'No matches.'}
						</p>
					{:else}
						<ul class="flex flex-col gap-1">
							{#each unassignedFiltered as p (p.id)}
								<li
									class="flex items-center gap-2 rounded-md border border-border bg-page px-2.5 py-1.5 text-[12px] text-primary"
								>
									<span class="min-w-0 flex-1 truncate">{p.display_name}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</Card>

			<!-- Round 1 matches -->
			<div class="flex flex-col gap-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="font-display text-[13px] uppercase tracking-[0.08em] text-primary">
							Round 1 · {roundOneCount} matches
						</h3>
						<p class="text-xs text-muted">Assign both sides, or leave a match empty to skip it.</p>
					</div>
					<Button variant="ghost" size="sm" onclick={clearPairings} disabled={assigned.size === 0}>
						<Eraser class="size-3.5" /> Clear
					</Button>
				</div>

				<div class="flex flex-col gap-2">
					{#each rows as row, i (i)}
						<Card padded={false}>
							<div class="flex flex-wrap items-center gap-2 px-3 py-2.5">
								<span
									class="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted"
								>
									Match {i + 1}
								</span>
								<div class="min-w-0 flex-1">
									<Select
										value={row.a ?? ''}
										items={optionsFor(row.a)}
										placeholder="— empty —"
										onValueChange={(v) => (row.a = v || null)}
									/>
								</div>
								<span class="shrink-0 text-[10px] font-bold uppercase text-muted">vs</span>
								<div class="min-w-0 flex-1">
									<Select
										value={row.b ?? ''}
										items={optionsFor(row.b)}
										placeholder="— empty —"
										onValueChange={(v) => (row.b = v || null)}
									/>
								</div>
							</div>
						</Card>
					{/each}
				</div>

				<!-- Validation + warnings -->
				<div class="flex flex-col gap-2">
					{#if halfFilled > 0}
						<p
							class="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger"
						>
							{halfFilled} match{halfFilled === 1 ? ' has' : 'es have'} only one side filled. Complete
							or clear {halfFilled === 1 ? 'it' : 'them'} before saving.
						</p>
					{/if}
					{#if unassigned.length > 0 && halfFilled === 0}
						<p
							class="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-primary"
						>
							{unassigned.length} {entryNoun}{unassigned.length === 1 ? '' : 's'} still unassigned —
							they won't be in the draw. You can still save.
						</p>
					{/if}
				</div>

				<!-- Save & build -->
				<div class="flex items-center justify-end gap-3 border-t border-border pt-4">
					{#if !confirmOpen}
						<Button onclick={onSaveClick} disabled={!canSaveManual || submitting}>
							<ArrowRight class="size-4" /> Save and build bracket
						</Button>
					{:else}
						<span class="text-[13px] text-muted">Replace the current draw?</span>
						<Button variant="ghost" onclick={() => (confirmOpen = false)}>Cancel</Button>
						<Button onclick={submitBuild} disabled={submitting}>
							{submitting ? 'Building…' : 'Yes, replace'}
						</Button>
					{/if}
				</div>

				<form
					id="buildManualForm"
					method="POST"
					action="?/build"
					class="hidden"
					use:enhance={toastEnhance({
						success: 'Bracket built',
						error: 'Could not build the bracket.',
						before: () => {
							submitting = true;
						},
						settle: () => {
							submitting = false;
							confirmOpen = false;
						}
					})}
				>
					<input type="hidden" name="matches" value={manualPayload} />
				</form>
			</div>
		</div>
	{/if}
</div>
