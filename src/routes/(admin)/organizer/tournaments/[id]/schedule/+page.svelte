<script lang="ts">
	import type { Tournament } from '$lib/api/types';
	import type { Court, ScheduleSlot } from '$lib/api/endpoints/schedule';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Plus } from '@lucide/svelte';

	type MatchOpt = { id: string; label: string; scheduled: boolean; playable: boolean };
	let {
		data,
		form
	}: {
		data: { tournament: Tournament; courts: Court[]; schedule: ScheduleSlot[]; matches: MatchOpt[] };
		form?: { error?: string };
	} = $props();

	let courtOpen = $state(false);
	let slotOpen = $state(false);
	let submitting = $state(false);
	let slotId = $state('');

	const assignable = $derived(data.matches.filter((m) => m.playable && !m.scheduled));

	function fmtTime(iso: string): string {
		return new Date(iso).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	}
	function removeSlot(id: string) {
		slotId = id;
		(document.getElementById('delSlotForm') as HTMLFormElement).requestSubmit();
	}
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<a href="/organizer/tournaments/{data.tournament.id}" class="text-sm text-muted hover:text-primary">← Tournament</a>
		<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">Schedule</h1>
	</div>
	<div class="flex gap-2">
		<Button variant="ghost" onclick={() => (courtOpen = true)}><Plus class="size-4" /> Court</Button>
		<Button onclick={() => (slotOpen = true)} disabled={data.courts.length === 0}
			><Plus class="size-4" /> Schedule match</Button
		>
	</div>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{form.error}</p>
{/if}

<!-- Courts -->
<div class="mb-6">
	<h2 class="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Courts</h2>
	{#if data.courts.length === 0}
		<p class="text-sm text-muted">No courts yet — add one to start scheduling.</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each data.courts as c (c.id)}
				<span class="rounded-pill border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-primary">{c.name}</span>
			{/each}
		</div>
	{/if}
</div>

<!-- Schedule -->
{#if data.schedule.length === 0}
	<EmptyState title="Nothing scheduled" message="Add courts, then assign matches to time slots." />
{:else}
	<Card padded={false}>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[520px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Time', 'Court', 'Match', ''] as h, hi (hi)}
							<th class="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.schedule as s (s.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-5 py-3 tabular-nums text-muted">{fmtTime(s.starts_at)}</td>
							<td class="px-5 py-3 font-bold text-primary">{s.court_name}</td>
							<td class="px-5 py-3 text-primary">{s.match_label ?? '—'}</td>
							<td class="px-5 py-3 text-right">
								<RowMenu>
									<RowMenuItem danger onSelect={() => removeSlot(s.id)}>Remove</RowMenuItem>
								</RowMenu>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<!-- Add court modal -->
<Modal bind:open={courtOpen} title="Add court" description="e.g. Centre Court, Court 2">
	<form
		method="POST"
		action="?/addCourt"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') { courtOpen = false; await invalidateAll(); }
			};
		}}
		class="flex flex-col gap-4"
	>
		<Field label="Court name"><input name="name" required class={inputClass} /></Field>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (courtOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>Add court</Button>
		</div>
	</form>
</Modal>

<!-- Schedule match modal -->
<Modal bind:open={slotOpen} title="Schedule a match" description="Assign a match to a court and time">
	<form
		method="POST"
		action="?/addSlot"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') { slotOpen = false; await invalidateAll(); }
			};
		}}
		class="flex flex-col gap-4"
	>
		<Field label="Court">
			<select name="court_id" required class={inputClass}>
				{#each data.courts as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
			</select>
		</Field>
		<Field label="Match" hint={assignable.length === 0 ? 'No unscheduled matches with both players set' : ''}>
			<select name="match_id" class={inputClass}>
				<option value="">— No match (hold slot) —</option>
				{#each assignable as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
			</select>
		</Field>
		<div class="grid grid-cols-2 gap-3">
			<Field label="Date"><input name="date" type="date" required class={inputClass} /></Field>
			<Field label="Time (UTC)"><input name="time" type="time" required class={inputClass} /></Field>
		</div>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (slotOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>Schedule</Button>
		</div>
	</form>
</Modal>

<form
	id="delSlotForm"
	method="POST"
	action="?/deleteSlot"
	class="hidden"
	use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}
>
	<input type="hidden" name="slotId" bind:value={slotId} />
</form>
