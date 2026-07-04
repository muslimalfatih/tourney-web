<script lang="ts">
	import type { EventRow } from '$lib/api/endpoints/events';
	import type { Participant } from '$lib/api/endpoints/participants';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Plus } from '@lucide/svelte';

	let {
		data,
		form
	}: {
		data: { event: EventRow; participants: Participant[] };
		form?: { error?: string };
	} = $props();

	let addOpen = $state(false);
	let submitting = $state(false);
	let deleteId = $state('');

	const formatLabel: Record<string, string> = {
		single_elim: 'Single elimination',
		round_robin: 'Round robin',
		group_knockout: 'Group → knockout'
	};

	const entryNoun = $derived(data.event.discipline === 'doubles' ? 'team' : 'player');

	function del(id: string) {
		deleteId = id;
		(document.getElementById('delPartForm') as HTMLFormElement).requestSubmit();
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
		{#if data.participants.some((p) => p.seed != null)}
			<Tag tone="gold">Seeded</Tag>
		{/if}
	</div>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
		{form.error}
	</p>
{/if}

<!-- Participants -->
<Card padded={false} class="mb-6">
	<div class="flex items-center justify-between border-b border-border px-5 py-4">
		<div>
			<h2 class="font-display text-[15px] uppercase tracking-[0.08em] text-primary">Participants</h2>
			<p class="text-xs text-muted">{data.participants.length} {entryNoun}{data.participants.length === 1 ? '' : 's'}</p>
		</div>
		<Button variant="ghost" size="sm" onclick={() => (addOpen = true)}>
			<Plus class="size-4" /> Add {entryNoun}
		</Button>
	</div>

	{#if data.participants.length === 0}
		<div class="p-5">
			<EmptyState
				title="No {entryNoun}s yet"
				message="Add {entryNoun}s and set seeds, then generate the draw."
			/>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[480px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Seed', data.event.discipline === 'doubles' ? 'Team' : 'Player', ''] as h (h)}
							<th class="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.participants as p (p.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-5 py-3">
								{#if p.seed != null}
									<span
										class="inline-grid size-6 place-items-center rounded-full border border-gold font-display text-[12px] text-gold"
										>{p.seed}</span
									>
								{:else}
									<span class="text-muted">—</span>
								{/if}
							</td>
							<td class="px-5 py-3 font-bold text-primary">{p.display_name}</td>
							<td class="px-5 py-3 text-right">
								<RowMenu>
									<RowMenuItem danger onSelect={() => del(p.id)}>Remove</RowMenuItem>
								</RowMenu>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<!-- Draw action footer -->
<div class="flex flex-wrap items-center gap-4 rounded-md border border-border bg-subtle p-4">
	<div class="grow">
		<div class="text-[13px] font-bold text-primary">
			{data.event.match_count > 0 ? 'Draw generated' : 'Ready to generate'}
		</div>
		<p class="mt-0.5 text-[13px] text-muted">
			{#if data.event.match_count > 0}
				This event has a bracket. Regenerating replaces it.
			{:else if data.participants.length < 2}
				Add at least 2 {entryNoun}s to generate a draw.
			{:else}
				{data.participants.length} {entryNoun}s — unfilled slots become byes.
			{/if}
		</p>
	</div>
	<form
		method="POST"
		action="/organizer/events/{data.event.id}?/generate"
		use:enhance={() => async ({ update }) => {
			await update();
			await invalidateAll();
		}}
	>
		{#if data.event.match_count > 0}
			<Button type="submit" variant="ghost">Regenerate</Button>
		{:else}
			<Button type="submit" disabled={data.participants.length < 2}>Generate draw</Button>
		{/if}
	</form>
	{#if data.event.match_count > 0}
		<a href="/organizer/events/{data.event.id}/matches"><Button variant="subtle">Enter scores</Button></a>
		<a href="/organizer/events/{data.event.id}/draw"><Button>View bracket</Button></a>
	{/if}
</div>

<!-- Add modal -->
<Modal
	bind:open={addOpen}
	title={`Add ${entryNoun}`}
	description={data.event.discipline === 'doubles'
		? 'Enter the pairing label (e.g. Wibowo / Sari)'
		: "Enter the player's name"}
>
	<form
		method="POST"
		action="?/addParticipant"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') {
					addOpen = false;
					await invalidateAll();
				}
			};
		}}
		class="flex flex-col gap-4"
	>
		<Field label={data.event.discipline === 'doubles' ? 'Team name' : 'Player name'}>
			<input name="display_name" required class={inputClass} />
		</Field>
		<Field label="Seed (optional)" hint="Leave blank for unseeded">
			<input name="seed" type="number" min="1" class={inputClass} />
		</Field>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (addOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add'}</Button>
		</div>
	</form>
</Modal>

<form
	id="delPartForm"
	method="POST"
	action="?/deleteParticipant"
	class="hidden"
	use:enhance={() => async ({ update }) => {
		await update();
		await invalidateAll();
	}}
>
	<input type="hidden" name="participantId" bind:value={deleteId} />
</form>
