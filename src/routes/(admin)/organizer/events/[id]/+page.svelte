<script lang="ts">
	import type { EventRow, EventBracket, BracketMatch } from '$lib/api/endpoints/events';
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { Court } from '$lib/api/endpoints/schedule';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import MatchBuilder from './MatchBuilder.svelte';
	import BracketMatchPanel from './BracketMatchPanel.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { toastEnhance } from '$lib/utils/toast';
	import { Plus } from '@lucide/svelte';

	let {
		data,
		form
	}: {
		data: { event: EventRow; participants: Participant[]; bracket: EventBracket; courts: Court[] };
		form?: { error?: string };
	} = $props();

	const formatLabel: Record<string, string> = {
		single_elim: 'Single elimination',
		round_robin: 'Round robin',
		group_knockout: 'Group → knockout'
	};

	const entryNoun = $derived(data.event.discipline === 'doubles' ? 'team' : 'player');
	const hasDraw = $derived(data.event.match_count > 0);
	// The Match builder is single-elim only; other formats keep the simple
	// generate flow on the Overview tab.
	const isSingleElim = $derived(data.event.format === 'single_elim');

	// Active tab is mirrored in the URL (?tab=) so reloads and links keep their place.
	const tabs = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'builder', label: 'Match builder' },
		{ value: 'bracket', label: 'Bracket' },
		{ value: 'participants', label: 'Participants' }
	];
	// Initial tab honours ?tab= for deep links; after that it's in-memory only.
	// (Mirroring back to the URL via replaceState broke hydration.)
	let tab = $state(page.url.searchParams.get('tab') ?? 'overview');
	// Jump to a tab from a button elsewhere on the page.
	function onTab(v: string) {
		tab = v;
	}

	// --- Participants add/remove/rename (Participants tab) ---
	let submitting = $state(false);
	let deleteId = $state('');
	let nameInput = $state<HTMLInputElement | null>(null);
	let addName = $state('');

	function del(id: string) {
		deleteId = id;
		(document.getElementById('delPartForm') as HTMLFormElement).requestSubmit();
	}

	// Inline edit-in-place: one row at a time turns into an input.
	let editId = $state<string | null>(null);
	let editName = $state('');
	let editInput = $state<HTMLInputElement | null>(null);
	let renaming = $state(false);

	async function startEdit(p: Participant) {
		editId = p.id;
		editName = p.display_name;
		await tick();
		editInput?.focus();
		editInput?.select();
	}
	function cancelEdit() {
		editId = null;
		editName = '';
	}

	// --- Bracket tab match panel ---
	let panelOpen = $state(false);
	let activeId = $state<string | null>(null);
	const matchById = $derived(
		new Map(data.bracket.rounds.flatMap((r) => r.matches).map((m) => [m.id, m] as const))
	);
	// Derive the active match from the id so it stays fresh after an invalidate
	// (score/schedule saved) without an effect that reads-and-writes state.
	const activeMatch = $derived(activeId ? (matchById.get(activeId) ?? null) : null);
	function openMatch(id: string) {
		activeId = id;
		panelOpen = true;
	}
</script>

<!-- Header -->
<div class="mb-6">
	<a
		href="/organizer/tournaments/{data.event.tournament_id}"
		class="text-sm text-muted transition-colors hover:text-primary">← Tournament</a
	>
	<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="font-display text-2xl uppercase tracking-[0.08em] text-primary">{data.event.name}</h1>
			<p class="text-xs capitalize text-muted">
				{data.event.discipline} · {formatLabel[data.event.format] ?? data.event.format}
			</p>
		</div>
	</div>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
		{form.error}
	</p>
{/if}

<Tabs bind:value={tab} items={tabs}>
	{#if tab === 'overview'}
		<!-- OVERVIEW -->
		<div class="grid gap-4 sm:grid-cols-3">
			<Card>
				<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Participants</p>
				<p class="mt-1 font-display text-3xl tabular-nums text-primary">{data.event.participant_count}</p>
				<p class="text-xs capitalize text-muted">{entryNoun}s entered</p>
			</Card>
			<Card>
				<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Matches</p>
				<p class="mt-1 font-display text-3xl tabular-nums text-primary">{data.event.match_count}</p>
				<p class="text-xs text-muted">{hasDraw ? 'Bracket generated' : 'No draw yet'}</p>
			</Card>
			<Card>
				<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Pairing</p>
				<p class="mt-1 font-display text-2xl capitalize text-primary">{data.event.pairing_mode}</p>
				<p class="text-xs text-muted">How round 1 was set</p>
			</Card>
		</div>

		<div
			class="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-border bg-subtle p-4"
		>
			<div class="grow">
				<div class="text-[13px] font-bold text-primary">
					{hasDraw ? 'Draw is ready' : 'Ready to build'}
				</div>
				<p class="mt-0.5 text-[13px] text-muted">
					{#if data.event.participant_count < 2}
						Add at least 2 {entryNoun}s in the Participants tab.
					{:else if isSingleElim}
						Use the Match builder to pair round 1 and build the bracket.
					{:else if hasDraw}
						This event has a {formatLabel[data.event.format]?.toLowerCase()} draw.
					{:else}
						Generate the {formatLabel[data.event.format]?.toLowerCase()} draw below.
					{/if}
				</p>
			</div>
			{#if isSingleElim}
				<Button onclick={() => onTab('builder')} disabled={data.event.participant_count < 2}>
					Open Match builder
				</Button>
			{:else}
				<!-- Non-single-elim formats (round robin, group knockout) use the
			     format-agnostic generator, not the single-elim Match builder. -->
				<form
					method="POST"
					action="?/generate"
					use:enhance={toastEnhance({ success: 'Draw generated', error: 'Could not generate the draw' })}
				>
					<Button type="submit" disabled={data.event.participant_count < 2}>
						{hasDraw ? 'Regenerate draw' : 'Generate draw'}
					</Button>
				</form>
			{/if}
			{#if hasDraw}
				<Button variant="subtle" onclick={() => onTab('bracket')}>View bracket</Button>
			{/if}
		</div>
	{:else if tab === 'builder'}
		<!-- MATCH BUILDER -->
		{#if isSingleElim}
			<MatchBuilder event={data.event} participants={data.participants} {hasDraw} {entryNoun} />
		{:else}
			<Card>
				<p class="text-sm text-muted">
					The Match builder is available for single-elimination events. This is a
					{formatLabel[data.event.format]?.toLowerCase()} event — generate its draw from the Overview
					tab.
				</p>
			</Card>
		{/if}
	{:else if tab === 'bracket'}
		<!-- BRACKET (read-heavy; click a node to edit schedule/score) -->
		{#if hasDraw}
			<p class="mb-3 text-xs text-muted">Click a match to set its court, time, or score.</p>
			<BurgundyBracket bracket={data.bracket} onMatchClick={openMatch} />
		{:else}
			<Card>
				<p class="text-sm text-muted">
					No bracket yet. Build it from the Match builder, then it appears here.
				</p>
			</Card>
		{/if}
	{:else if tab === 'participants'}
		<!-- PARTICIPANTS -->
		<Card padded={false}>
			<div class="flex items-center justify-between border-b border-border px-5 py-4">
				<div>
					<h2 class="font-display text-[15px] uppercase tracking-[0.08em] text-primary">Participants</h2>
					<p class="text-xs text-muted">
						{data.participants.length} {entryNoun}{data.participants.length === 1 ? '' : 's'}
					</p>
				</div>
			</div>

			<!-- Inline add row: type a name, press Enter, keep going. -->
			<form
				method="POST"
				action="?/addParticipant"
				use:enhance={toastEnhance({
					success: `${entryNoun === 'team' ? 'Team' : 'Player'} added`,
					error: 'Could not add',
					before: () => {
						submitting = true;
					},
					settle: () => {
						submitting = false;
					},
					onSuccess: async () => {
						addName = '';
						await tick();
						nameInput?.focus();
					}
				})}
				class="flex flex-wrap items-end gap-2 border-b border-border bg-subtle/50 px-5 py-3"
			>
				<div class="flex min-w-[180px] flex-1 flex-col gap-1">
					<label for="add-name" class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
						{data.event.discipline === 'doubles' ? 'Team name' : 'Player name'}
					</label>
					<input
						id="add-name"
						name="display_name"
						bind:this={nameInput}
						bind:value={addName}
						required
						autocomplete="off"
						placeholder={data.event.discipline === 'doubles' ? 'Wibowo / Sari' : 'Andi Wibowo'}
						class={inputClass}
					/>
				</div>
				<Button type="submit" disabled={submitting || !addName.trim()}>
					<Plus class="size-4" /> Add
				</Button>
			</form>

			{#if data.participants.length === 0}
				<div class="px-5 py-8">
					<p class="text-center text-sm text-muted">
						No {entryNoun}s yet — add your first above, then build the draw.
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[420px] border-collapse text-[13px]">
						<thead>
							<tr class="border-b border-border text-left">
								{#each [data.event.discipline === 'doubles' ? 'Team' : 'Player', ''] as h, hi (hi)}
									<th class="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
										>{h}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.participants as p (p.id)}
								<tr class="border-b border-border transition-colors hover:bg-subtle">
									{#if editId === p.id}
										<!-- Inline edit: the row's name becomes an input, committed via a
										     form so it goes through use:enhance + invalidate. -->
										<td class="px-5 py-2" colspan="2">
											<form
												method="POST"
												action="?/renameParticipant"
												use:enhance={toastEnhance({
													success: 'Name updated',
													error: 'Could not rename',
													before: () => {
														renaming = true;
													},
													settle: () => {
														renaming = false;
													},
													onSuccess: cancelEdit
												})}
												class="flex items-center gap-2"
											>
												<input type="hidden" name="participantId" value={p.id} />
												<input
													name="display_name"
													bind:this={editInput}
													bind:value={editName}
													required
													autocomplete="off"
													onkeydown={(e) => e.key === 'Escape' && cancelEdit()}
													class="{inputClass} h-9 flex-1"
												/>
												<Button type="submit" size="sm" disabled={renaming || !editName.trim()}>
													{renaming ? 'Saving…' : 'Save'}
												</Button>
												<Button
													type="button"
													variant="subtle"
													size="sm"
													onclick={cancelEdit}
													disabled={renaming}>Cancel</Button
												>
											</form>
										</td>
									{:else}
										<td class="px-5 py-3 font-bold text-primary">{p.display_name}</td>
										<td class="px-5 py-3 text-right">
											<RowMenu>
												<RowMenuItem onSelect={() => startEdit(p)}>Edit</RowMenuItem>
												<RowMenuItem danger onSelect={() => del(p.id)}>Remove</RowMenuItem>
											</RowMenu>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	{/if}
</Tabs>

<!-- Bracket match edit panel -->
<BracketMatchPanel
	bind:open={panelOpen}
	match={activeMatch}
	tournamentId={data.event.tournament_id}
	courts={data.courts}
/>

<form
	id="delPartForm"
	method="POST"
	action="?/deleteParticipant"
	class="hidden"
	use:enhance={toastEnhance({ success: 'Removed', error: 'Could not remove' })}
>
	<input type="hidden" name="participantId" bind:value={deleteId} />
</form>
