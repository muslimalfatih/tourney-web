<script lang="ts">
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { EventBracket } from '$lib/api/endpoints/events';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import { classifyPairing } from '$lib/utils/fixtures';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { Plus, Trash2 } from '@lucide/svelte';

	// Fully-manual round-robin setup: the organizer adds one fixture (A vs B) at a
	// time; pending fixtures can be removed. Played fixtures are read-only.
	let {
		participants,
		bracket,
		entryNoun
	}: {
		participants: Participant[];
		bracket: EventBracket;
		entryNoun: string;
	} = $props();

	// Existing fixtures come back as a single round for round-robin (no next
	// pointer). Flatten to a list with both side names + ids + status; the ids
	// feed the duplicate pre-check.
	const fixtures = $derived(
		bracket.rounds.flatMap((r) => r.matches).map((m) => ({
			id: m.id,
			match_no: m.match_no,
			status: m.status,
			a: m.participants.find((p) => p.slot === 1)?.display_name ?? 'TBD',
			b: m.participants.find((p) => p.slot === 2)?.display_name ?? 'TBD',
			a_id: m.participants.find((p) => p.slot === 1)?.participant_id ?? null,
			b_id: m.participants.find((p) => p.slot === 2)?.participant_id ?? null
		}))
	);

	let teamA = $state('');
	let teamB = $state('');
	const items = $derived([
		{ value: '', label: `Select ${entryNoun}` },
		...participants.map((p) => ({ value: p.id, label: p.display_name }))
	]);
	// B can't be the same as A.
	const itemsB = $derived(items.filter((i) => i.value !== teamA || i.value === ''));

	const canAdd = $derived(teamA !== '' && teamB !== '' && teamA !== teamB);
	let adding = $state(false);
	let generating = $state(false);
	let addForm = $state<HTMLFormElement>();

	// Duplicate pre-check (mirrors the server table; server stays
	// authoritative and 409s on stale data). 'blocked' disables Add outright;
	// 'rematch' swaps Add for an explicit confirmation that is the ONLY path
	// sending allow_rematch=true.
	const verdict = $derived(canAdd ? classifyPairing(fixtures, teamA, teamB) : { kind: 'ok' as const });
	let allowRematch = $state(false);

	async function submitAdd(asRematch = false) {
		allowRematch = asRematch;
		// Flush state into the hidden allow_rematch input BEFORE submitting —
		// requestSubmit reads the DOM synchronously, and without the tick the
		// rematch confirmation posted allow_rematch=false and 409'd again
		// (found by the Phase 4E browser suite).
		await tick();
		addForm?.requestSubmit();
	}

	// One hidden form per fixture handles delete; we set the id then submit.
	let delId = $state('');
	let delForm = $state<HTMLFormElement>();
	function del(id: string) {
		delId = id;
		delForm?.requestSubmit();
	}
</script>

<div class="flex flex-col gap-5">
	{#if participants.length < 2}
		<Card>
			<p class="text-sm text-muted">
				Add at least 2 {entryNoun}s in the Participants tab before adding fixtures.
			</p>
		</Card>
	{:else}
		<!-- Add a fixture -->
		<Card>
			<h3 class="font-mono font-medium text-[11px] uppercase tracking-[0.16em] text-primary">Add fixture</h3>
			<p class="mt-1 text-xs text-muted">
				Pick two {entryNoun}s to create a match. Add every fixture you want to play.
			</p>
			<form
				bind:this={addForm}
				method="POST"
				action="?/addManualMatch"
				class="mt-3 flex flex-wrap items-center gap-2"
				use:enhance={toastEnhance({
					success: 'Fixture added',
					error: 'Could not add the fixture.',
					before: () => (adding = true),
					onSuccess: () => {
						teamA = '';
						teamB = '';
					},
					settle: () => {
						adding = false;
						allowRematch = false;
					}
				})}
			>
				<input type="hidden" name="team_a_id" value={teamA} />
				<input type="hidden" name="team_b_id" value={teamB} />
				<input type="hidden" name="allow_rematch" value={allowRematch ? 'true' : 'false'} />
				<div class="min-w-[10rem] flex-1">
					<Select value={teamA} {items} placeholder="Select {entryNoun}" onValueChange={(v) => (teamA = v)} />
				</div>
				<span class="text-[10px] font-mono font-medium uppercase text-muted">vs</span>
				<div class="min-w-[10rem] flex-1">
					<Select value={teamB} items={itemsB} placeholder="Select {entryNoun}" onValueChange={(v) => (teamB = v)} />
				</div>
				<Button type="button" onclick={() => submitAdd(false)} disabled={!canAdd || adding || verdict.kind !== 'ok'}>
					<Plus class="size-4" /> Add
				</Button>
			</form>
			{#if verdict.kind === 'blocked'}
				<p class="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
					These {entryNoun}s already have an unplayed fixture (Match {verdict.existing.match_no}
					· {verdict.existing.status}). Remove or play it first.
				</p>
			{:else if verdict.kind === 'rematch'}
				<div class="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] text-accent">
					<p>
						These {entryNoun}s already played (Match {verdict.existing.match_no}
						· {verdict.existing.status}). Create a rematch?
					</p>
					<Button class="mt-2" onclick={() => submitAdd(true)} disabled={adding}>
						Create rematch
					</Button>
				</div>
			{/if}
		</Card>

		<!-- Existing fixtures -->
		<Card padded={false}>
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
				<div>
					<h3 class="font-mono font-medium text-[11px] uppercase tracking-[0.16em] text-primary">
						Fixtures · {fixtures.length}
					</h3>
					<p class="text-xs text-muted">Remove a fixture only before it has been played.</p>
				</div>
				<!-- Idempotent everyone-plays-everyone generation: existing fixtures
				     are kept, only missing pairings are created, so repeated clicks
				     never duplicate. -->
				<form
					method="POST"
					action="?/generateFixtures"
					use:enhance={toastEnhance({
						success: 'Missing fixtures generated',
						error: 'Could not generate fixtures.',
						before: () => {
							if (generating) return false;
							generating = true;
						},
						settle: () => (generating = false)
					})}
				>
					<Button type="submit" variant="ghost" disabled={generating}>
						Generate all fixtures
					</Button>
				</form>
			</div>
			{#if fixtures.length === 0}
				<p class="px-5 py-8 text-center text-sm text-muted">No fixtures yet. Add one above.</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each fixtures as f (f.id)}
						<li class="flex items-center gap-3 px-5 py-3">
							<span class="w-14 shrink-0 text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-muted">
								Match {f.match_no}
							</span>
							<span class="min-w-0 flex-1 truncate text-[13px] text-primary">
								{f.a} <span class="text-muted">vs</span> {f.b}
							</span>
							<span class="shrink-0 text-[11px] capitalize text-muted">{f.status}</span>
							{#if f.status === 'pending'}
								<button
									type="button"
									onclick={() => del(f.id)}
									aria-label="Remove fixture"
									class="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
								>
									<Trash2 class="size-4" />
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card>

		<form
			bind:this={delForm}
			method="POST"
			action="?/deleteManualMatch"
			class="hidden"
			use:enhance={toastEnhance({ success: 'Fixture removed', error: 'Could not remove the fixture.' })}
		>
			<input type="hidden" name="matchId" value={delId} />
		</form>
	{/if}
</div>
