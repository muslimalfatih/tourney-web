<script lang="ts">
	import type { EventRow, EventBracket, BracketMatch, GroupKnockout } from '$lib/api/endpoints/events';
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { Court } from '$lib/api/endpoints/schedule';
	import type { Tournament } from '$lib/api/types';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import MatchBuilder from './MatchBuilder.svelte';
	import RoundRobinBuilder from './RoundRobinBuilder.svelte';
	import GroupBuilder from './GroupBuilder.svelte';
	import BracketMatchPanel from './BracketMatchPanel.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { toastEnhance } from '$lib/utils/toast';
	import { Plus, ExternalLink } from '@lucide/svelte';

	let {
		data,
		form
	}: {
		data: {
			event: EventRow;
			participants: Participant[];
			bracket: EventBracket;
			courts: Court[];
			tournament: Tournament;
			groupKnockout: GroupKnockout | null;
		};
		form?: { error?: string };
	} = $props();

	const formatLabel: Record<string, string> = {
		single_elim: 'Single elimination',
		round_robin: 'Round robin',
		group_knockout: 'Group → knockout'
	};

	const entryNoun = $derived(data.event.discipline === 'doubles' ? 'team' : 'player');
	const hasDraw = $derived(data.event.match_count > 0);

	// Fixed category set (skill levels), matching the tournament page's create flow.
	// An existing off-list value is preserved as an extra option so saving Public
	// settings never silently drops it.
	const CATEGORY_OPTIONS = ['Newbie', 'Beginner', 'Intermediate', 'Advanced', 'Open'];
	const categoryChoices = $derived(
		data.event.category && !CATEGORY_OPTIONS.includes(data.event.category)
			? [data.event.category, ...CATEGORY_OPTIONS]
			: CATEGORY_OPTIONS
	);

	// Active tab is mirrored in the URL (?tab=) so reloads and links keep their place.
	const tabs = [
		{ value: 'overview', label: 'Overview' },
		{ value: 'builder', label: 'Draw setup' },
		{ value: 'bracket', label: 'Bracket' },
		{ value: 'participants', label: 'Participants' },
		{ value: 'public', label: 'Public settings' }
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

	// Optimistic add: names submitted but not yet confirmed by the server. They
	// render immediately (as pending rows) so adding a roster feels instant, then
	// get cleared once invalidateAll brings the real rows back (success) or the
	// action fails. Keyed by a temp id so Svelte doesn't collide them with real ids.
	let pending = $state<{ tempId: string; display_name: string }[]>([]);
	let pendingSeq = 0;
	// Real rows first, then any still-pending optimistic rows. Pending rows carry
	// the full Participant shape (nulls) so row helpers stay type-clean.
	const rows = $derived<(Participant & { pending: boolean })[]>([
		...data.participants.map((p) => ({ ...p, pending: false })),
		...pending.map((p) => ({
			id: p.tempId,
			event_id: data.event.id,
			player_id: null,
			team_id: null,
			display_name: p.display_name,
			seed: null,
			pending: true
		}))
	]);

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

	// --- Overview group panel (group_knockout only) ---
	const groups = $derived(data.groupKnockout?.groups ?? []);
	let activeGroupId = $state<string | null>(null);
	const activeGroup = $derived(
		groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null
	);
	let savingAdvance = $state(false);

	// --- Public settings tab ---
	let savingPublic = $state(false);
	// The public bracket route, pre-filtered to this event's category/gender/phase
	// (Part 2 reads these query params). Group-stage events default the phase to
	// 'group', otherwise 'knockout'.
	const publicPhase = $derived(data.event.has_group_stage ? 'group' : 'knockout');
	const publicUrl = $derived(() => {
		const qs = new URLSearchParams({ event: data.event.id, phase: publicPhase });
		if (data.event.category) qs.set('category', data.event.category);
		qs.set('gender', data.event.gender);
		return `/tournaments/${data.tournament.slug}/bracket?${qs}`;
	});

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
					{:else if hasDraw}
						This event has a {formatLabel[data.event.format]?.toLowerCase()} draw.
					{:else}
						Set up the {formatLabel[data.event.format]?.toLowerCase()} draw in the Draw setup tab.
					{/if}
				</p>
			</div>
			<Button onclick={() => onTab('builder')} disabled={data.event.participant_count < 2}>
				{hasDraw ? 'Edit draw setup' : 'Set up draw'}
			</Button>
			{#if hasDraw}
				<Button variant="subtle" onclick={() => onTab('bracket')}>View bracket</Button>
			{/if}
		</div>

		<!-- Group management (group_knockout events with a generated draw) -->
		{#if data.event.has_group_stage && data.event.format === 'group_knockout' && groups.length > 0 && activeGroup}
			<Card padded={false} class="mt-4">
				<div
					class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
				>
					<div>
						<h2 class="font-display text-[15px] uppercase tracking-[0.08em] text-primary">
							Groups &amp; standings
						</h2>
						<p class="text-xs text-muted">Standings recompute automatically from match results.</p>
					</div>
					<!-- Group switcher -->
					<div class="flex flex-wrap gap-2">
						{#each groups as g (g.id)}
							<Chip active={activeGroup.id === g.id} onclick={() => (activeGroupId = g.id)}>
								{g.name}
							</Chip>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-4 p-5">
					<!-- Advance count editor -->
					<form
						method="POST"
						action="?/setGroupAdvance"
						use:enhance={toastEnhance({
							success: 'Advance count updated',
							error: 'Could not update',
							before: () => {
								savingAdvance = true;
							},
							settle: () => {
								savingAdvance = false;
							}
						})}
						class="flex flex-wrap items-end gap-3 rounded-md border border-border bg-page px-4 py-3"
					>
						<input type="hidden" name="groupId" value={activeGroup.id} />
						<Field label="Teams that advance from {activeGroup.name}">
							<input
								name="advance_count"
								type="number"
								min="1"
								value={activeGroup.advance_count}
								class="{inputClass} w-24"
							/>
						</Field>
						<Button type="submit" size="sm" disabled={savingAdvance}>
							{savingAdvance ? 'Saving…' : 'Save'}
						</Button>
						<p class="grow text-right text-[11px] text-muted">
							Top {activeGroup.advance_count} advance to the knockout stage.
						</p>
					</form>

					<!-- Computed standings (read-only) -->
					<Standings standings={activeGroup.standings} />
				</div>
			</Card>
		{/if}
	{:else if tab === 'builder'}
		<!-- DRAW SETUP — manual, per format -->
		{#if data.event.format === 'round_robin'}
			<RoundRobinBuilder participants={data.participants} bracket={data.bracket} {entryNoun} />
		{:else if data.event.format === 'group_knockout'}
			<GroupBuilder
				participants={data.participants}
				groupKnockout={data.groupKnockout}
				{hasDraw}
				{entryNoun}
			/>
		{:else}
			<MatchBuilder participants={data.participants} bracket={data.bracket} {hasDraw} {entryNoun} />
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
						{rows.length} {entryNoun}{rows.length === 1 ? '' : 's'}
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
						// Show the new row instantly; reconciled in settle.
						const name = addName.trim();
						if (name) pending = [...pending, { tempId: `tmp-${pendingSeq++}`, display_name: name }];
						addName = ''; // clear now so the next name can be typed immediately
						nameInput?.focus();
					},
					settle: () => {
						submitting = false;
						// Real data is loaded (success) or the add failed — drop the
						// optimistic rows either way. On success the real row replaces it;
						// on failure it simply disappears and the error toast shows.
						pending = [];
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

			{#if rows.length === 0}
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
							{#each rows as p (p.id)}
								<tr
									in:fly={{ y: -6, duration: 150, easing: cubicOut }}
									class="border-b border-border transition-colors hover:bg-subtle {p.pending
										? 'opacity-50'
										: ''}"
								>
									{#if p.pending}
										<!-- Optimistic row: name shown instantly, no actions until confirmed. -->
										<td class="px-5 py-3 font-bold text-primary">{p.display_name}</td>
										<td class="px-5 py-3 text-right text-[11px] text-muted">Adding…</td>
									{:else if editId === p.id}
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
	{:else if tab === 'public'}
		<!-- PUBLIC SETTINGS — per-event visibility + category/gender/order config -->
		<div class="grid gap-5 lg:grid-cols-[1fr_20rem]">
			<Card padded={false}>
				<div class="border-b border-border px-5 py-4">
					<h2 class="font-display text-[15px] uppercase tracking-[0.08em] text-primary">
						Public settings
					</h2>
					<p class="text-xs text-muted">Controls how this division appears on the public site.</p>
				</div>

				<form
					method="POST"
					action="?/updatePublicSettings"
					use:enhance={toastEnhance({
						success: 'Public settings updated',
						error: 'Could not save settings',
						before: () => {
							savingPublic = true;
						},
						settle: () => {
							savingPublic = false;
						}
					})}
					class="flex flex-col gap-4 p-5"
				>
					<label
						class="flex items-center justify-between gap-3 rounded-md border border-border bg-page px-3 py-2.5"
					>
						<span>
							<span class="text-[13px] font-bold text-primary">Show in category tabs</span>
							<span class="mt-0.5 block text-[11px] text-muted"
								>Publicly list this division in the tournament's category strip.</span
							>
						</span>
						<input
							type="checkbox"
							name="is_public"
							checked={data.event.is_public}
							class="size-4 shrink-0 accent-accent"
						/>
					</label>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field label="Category">
							<select name="category" class={inputClass} value={data.event.category ?? ''}>
								<option value="">— None —</option>
								{#each categoryChoices as c (c)}
									<option value={c}>{c}</option>
								{/each}
							</select>
						</Field>
						<Field label="Gender">
							<select name="gender" class={inputClass} value={data.event.gender}>
								<option value="men">Men</option>
								<option value="women">Women</option>
								<option value="mixed">Mixed</option>
							</select>
						</Field>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field label="Public display name">
							<input
								name="public_display_name"
								value={data.event.public_display_name ?? ''}
								autocomplete="off"
								placeholder={data.event.name}
								class={inputClass}
							/>
						</Field>
						<Field label="Order in category strip">
							<input
								name="public_order"
								type="number"
								min="0"
								value={data.event.public_order}
								class={inputClass}
							/>
						</Field>
					</div>

					<p class="text-[11px] text-muted">
						Leave the display name blank to fall back to <span class="text-primary"
							>{data.event.name}</span
						>.
					</p>

					<div class="flex justify-end border-t border-border pt-4">
						<Button type="submit" disabled={savingPublic}>
							{savingPublic ? 'Saving…' : 'Save public settings'}
						</Button>
					</div>
				</form>
			</Card>

			<!-- Live public URL + preview -->
			<Card class="h-max">
				<p class="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Public URL</p>
				<code
					class="mt-2 block overflow-x-auto rounded border border-border bg-page px-2 py-1.5 text-[11px] text-primary"
					>{publicUrl()}</code
				>
				<p class="mt-2 text-[11px] text-muted">
					{#if data.tournament.status === 'published'}
						{#if data.event.is_public}
							Live — visible to the public now.
						{:else}
							Hidden — set "Show in category tabs" to make it visible.
						{/if}
					{:else}
						The tournament is not published yet, so nothing is public.
					{/if}
				</p>
				<a href={publicUrl()} target="_blank" rel="noopener" class="mt-4 block">
					<Button variant="subtle" size="sm" class="w-full">
						<ExternalLink class="size-3.5" /> Preview public page
					</Button>
				</a>
			</Card>
		</div>
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
