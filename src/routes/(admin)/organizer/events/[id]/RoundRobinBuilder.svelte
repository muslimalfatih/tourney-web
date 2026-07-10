<script lang="ts">
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { EventBracket } from '$lib/api/endpoints/events';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
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
	// pointer). Flatten to a list with both side names + status.
	const fixtures = $derived(
		bracket.rounds.flatMap((r) => r.matches).map((m) => ({
			id: m.id,
			match_no: m.match_no,
			status: m.status,
			a: m.participants.find((p) => p.slot === 1)?.display_name ?? 'TBD',
			b: m.participants.find((p) => p.slot === 2)?.display_name ?? 'TBD'
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
	let addForm = $state<HTMLFormElement>();

	function submitAdd() {
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
			<h3 class="font-display text-[13px] uppercase tracking-[0.08em] text-primary">Add fixture</h3>
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
					settle: () => {
						adding = false;
						teamA = '';
						teamB = '';
					}
				})}
			>
				<input type="hidden" name="team_a_id" value={teamA} />
				<input type="hidden" name="team_b_id" value={teamB} />
				<div class="min-w-[10rem] flex-1">
					<Select value={teamA} {items} placeholder="Select {entryNoun}" onValueChange={(v) => (teamA = v)} />
				</div>
				<span class="text-[10px] font-bold uppercase text-muted">vs</span>
				<div class="min-w-[10rem] flex-1">
					<Select value={teamB} items={itemsB} placeholder="Select {entryNoun}" onValueChange={(v) => (teamB = v)} />
				</div>
				<Button type="button" onclick={submitAdd} disabled={!canAdd || adding}>
					<Plus class="size-4" /> Add
				</Button>
			</form>
		</Card>

		<!-- Existing fixtures -->
		<Card padded={false}>
			<div class="border-b border-border px-5 py-4">
				<h3 class="font-display text-[13px] uppercase tracking-[0.08em] text-primary">
					Fixtures · {fixtures.length}
				</h3>
				<p class="text-xs text-muted">Remove a fixture only before it has been played.</p>
			</div>
			{#if fixtures.length === 0}
				<p class="px-5 py-8 text-center text-sm text-muted">No fixtures yet. Add one above.</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each fixtures as f (f.id)}
						<li class="flex items-center gap-3 px-5 py-3">
							<span class="w-14 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
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
