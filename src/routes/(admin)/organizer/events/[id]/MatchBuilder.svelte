<script lang="ts">
	import type { EventRow, PairingMode } from '$lib/api/endpoints/events';
	import type { Participant } from '$lib/api/endpoints/participants';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Shuffle, Eraser, Search, ArrowRight } from '@lucide/svelte';

	let {
		event,
		participants,
		hasDraw,
		entryNoun
	}: {
		event: EventRow;
		participants: Participant[];
		hasDraw: boolean;
		entryNoun: string;
	} = $props();

	// Pairing mode. Seed the initial choice once from the event's saved mode;
	// after mount the user's clicks own `mode`. untrack keeps this a one-time
	// default, not a reactive binding to the prop.
	let mode = $state<PairingMode>(untrack(() => event.pairing_mode) ?? 'auto');

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

	// The editable grid. Rebuilt whenever the match count changes (e.g. a
	// participant was added/removed on another tab), preserving nothing — the
	// organizer starts from a clean slate, which is the safe default.
	let rows = $state<MatchRow[]>([]);
	let builtFor = $state(-1);
	$effect(() => {
		if (roundOneCount !== builtFor) {
			rows = Array.from({ length: roundOneCount }, () => ({ a: null, b: null }));
			builtFor = roundOneCount;
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
	// Auto-fill drops the remaining unassigned teams into empty slots, shuffled,
	// so the organizer gets a complete draw they can then tweak.
	function autoFill() {
		const pool = [...unassigned].sort(() => Math.random() - 0.5);
		const next = rows.map((r) => ({ ...r }));
		for (const r of next) {
			if (r.a === null && pool.length) r.a = pool.shift()!.id;
			if (r.b === null && pool.length) r.b = pool.shift()!.id;
		}
		rows = next;
	}

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
	<!-- Pairing mode selector -->
	<Card>
		<div class="mb-3">
			<h2 class="font-display text-[15px] uppercase tracking-[0.08em] text-primary">Pairing mode</h2>
			<p class="text-xs text-muted">Choose how round 1 is decided, then build the bracket.</p>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each [{ v: 'auto', t: 'Auto-generate', d: 'Random pairs from the entered ' + entryNoun + 's.' }, { v: 'manual', t: 'Manual pairings', d: 'You decide who plays who in round 1.' }] as opt (opt.v)}
				<button
					type="button"
					onclick={() => (mode = opt.v as PairingMode)}
					class="rounded-md border p-3 text-left transition-colors {mode === opt.v
						? 'border-accent bg-accent/5'
						: 'border-border hover:border-accent/50'}"
				>
					<div class="flex items-center gap-2">
						<span
							class="grid size-4 place-items-center rounded-full border {mode === opt.v
								? 'border-accent'
								: 'border-border'}"
						>
							{#if mode === opt.v}<span class="size-2 rounded-full bg-accent"></span>{/if}
						</span>
						<span class="text-[13px] font-bold text-primary">{opt.t}</span>
					</div>
					<p class="mt-1 pl-6 text-xs text-muted">{opt.d}</p>
				</button>
			{/each}
		</div>
	</Card>

	{#if participants.length < 2}
		<Card>
			<p class="text-sm text-muted">
				Add at least 2 {entryNoun}s in the Participants tab before building a bracket.
			</p>
		</Card>
	{:else if mode === 'auto'}
		<!-- Auto mode -->
		<Card>
			<h3 class="font-display text-[13px] uppercase tracking-[0.08em] text-primary">
				Auto-generate bracket
			</h3>
			<p class="mt-1 text-[13px] text-muted">
				We'll pair the {participants.length} entered {entryNoun}s at random into a single-elimination
				draw. Unfilled slots become byes. {hasDraw ? 'This replaces the current draw.' : ''}
			</p>
			<form
				method="POST"
				action="?/build"
				use:enhance={toastEnhance({
					success: 'Bracket built',
					error: 'Could not build the bracket.',
					before: () => {
						submitting = true;
					},
					settle: () => {
						submitting = false;
					}
				})}
				class="mt-4"
			>
				<input type="hidden" name="pairing_mode" value="auto" />
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Building…' : hasDraw ? 'Regenerate bracket' : 'Generate bracket'}
				</Button>
			</form>
		</Card>
	{:else}
		<!-- Manual mode: unassigned list + round-1 editor -->
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
					<div class="flex gap-2">
						<Button variant="subtle" size="sm" onclick={autoFill} disabled={unassigned.length === 0}>
							<Shuffle class="size-3.5" /> Auto-fill remaining
						</Button>
						<Button variant="ghost" size="sm" onclick={clearPairings} disabled={assigned.size === 0}>
							<Eraser class="size-3.5" /> Clear
						</Button>
					</div>
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
					<input type="hidden" name="pairing_mode" value="manual" />
					<input type="hidden" name="matches" value={manualPayload} />
				</form>
			</div>
		</div>
	{/if}
</div>
