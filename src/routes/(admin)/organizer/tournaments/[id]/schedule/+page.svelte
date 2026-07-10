<script lang="ts">
	import type { Tournament } from '$lib/api/types';
	import type { Court, ScheduleSlot } from '$lib/api/endpoints/schedule';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import DateTimePicker from '$lib/components/ui/DateTimePicker.svelte';
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

	// Slot-modal field state (bits-ui Select / DateTimePicker aren't native form
	// inputs, so we bind here and forward via hidden fields / the Select `name`).
	let slotCourt = $state('');
	let slotMatch = $state('');
	let slotStartsAt = $state(''); // ISO from the picker

	const assignable = $derived(data.matches.filter((m) => m.playable && !m.scheduled));
	const courtItems = $derived(data.courts.map((c) => ({ value: c.id, label: c.name })));
	const matchItems = $derived([
		{ value: '', label: '— No match (hold slot) —' },
		...assignable.map((m) => ({ value: m.id, label: m.label }))
	]);

	// Reset the slot form each time the modal opens; default the court to the
	// first one so a valid selection is pre-filled.
	function openSlot() {
		slotCourt = data.courts[0]?.id ?? '';
		slotMatch = '';
		slotStartsAt = '';
		slotOpen = true;
	}

	function fmtTime(iso: string): string {
		return new Date(iso).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
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
		<Button onclick={openSlot} disabled={data.courts.length === 0}
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
		use:enhance={toastEnhance({
			success: 'Court added',
			reset: true,
			before: () => { submitting = true; },
			onSuccess: () => { courtOpen = false; },
			settle: () => { submitting = false; }
		})}
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
		use:enhance={toastEnhance({
			success: 'Match scheduled',
			reset: true,
			before: () => { submitting = true; },
			onSuccess: () => { slotOpen = false; },
			settle: () => { submitting = false; }
		})}
		class="flex flex-col gap-4"
	>
		<!-- bits-ui Select/DateTimePicker aren't native inputs: the Select emits its
		     own hidden field via `name`; the picker's ISO goes through this one. -->
		<input type="hidden" name="starts_at" value={slotStartsAt} />
		<Field label="Court">
			<Select name="court_id" bind:value={slotCourt} items={courtItems} placeholder="Pick a court" />
		</Field>
		<Field label="Match" hint={assignable.length === 0 ? 'No unscheduled matches with both players set' : ''}>
			<Select name="match_id" bind:value={slotMatch} items={matchItems} placeholder="— No match (hold slot) —" />
		</Field>
		<Field label="Start">
			<DateTimePicker bind:value={slotStartsAt} />
		</Field>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (slotOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting || !slotCourt || !slotStartsAt}>Schedule</Button>
		</div>
	</form>
</Modal>

<form
	id="delSlotForm"
	method="POST"
	action="?/deleteSlot"
	class="hidden"
	use:enhance={toastEnhance({ success: 'Slot removed' })}
>
	<input type="hidden" name="slotId" bind:value={slotId} />
</form>
