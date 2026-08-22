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
	import { zonedDayLabel, zonedTime } from '$lib/utils/tz';
	import { Plus, Clock } from '@lucide/svelte';

	type MatchOpt = { id: string; label: string; scheduled: boolean; playable: boolean };
	let {
		data,
		form
	}: {
		data: { tournament: Tournament; courts: Court[]; schedule: ScheduleSlot[]; matches: MatchOpt[] };
		form?: { error?: string; restWarning?: string };
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
	// Which slot we're editing (''  = creating a new one). Drives the modal's
	// title, action, and whether the currently-assigned match stays selectable.
	let editingId = $state('');

	const assignable = $derived(data.matches.filter((m) => m.playable && !m.scheduled));
	const courtItems = $derived(data.courts.map((c) => ({ value: c.id, label: c.name })));
	// Match options: unscheduled playable matches, plus — when editing — the slot's
	// own currently-assigned match (which is 'scheduled', so otherwise filtered out).
	const matchItems = $derived.by(() => {
		const opts = [{ value: '', label: '— No match (hold slot) —' }];
		const seen = new Set<string>();
		for (const m of assignable) {
			opts.push({ value: m.id, label: m.label });
			seen.add(m.id);
		}
		if (editingId && slotMatch && !seen.has(slotMatch)) {
			const current = data.matches.find((m) => m.id === slotMatch);
			if (current) opts.push({ value: current.id, label: current.label });
		}
		return opts;
	});

	// Reset the slot form for a NEW slot; default the court to the first one.
	function openNewSlot() {
		editingId = '';
		slotCourt = data.courts[0]?.id ?? '';
		slotMatch = '';
		slotStartsAt = '';
		slotOpen = true;
	}
	// Pre-fill the slot form from an existing slot for editing.
	function openEditSlot(s: ScheduleSlot) {
		editingId = s.id;
		slotCourt = s.court_id;
		slotMatch = s.match_id ?? '';
		slotStartsAt = s.starts_at;
		slotOpen = true;
	}

	// All schedule times render in the TOURNAMENT's timezone, not the browser's,
	// so the organizer sees the same wall-clock the venue and public site do.
	const tz = $derived(data.tournament.timezone);
	function fmtTime(iso: string): string {
		return zonedTime(iso, tz);
	}
	function removeSlot(id: string) {
		slotId = id;
		(document.getElementById('delSlotForm') as HTMLFormElement).requestSubmit();
	}

	// Group slots by calendar day so a busy schedule reads as a day-by-day agenda
	// rather than one long undifferentiated table. Slots arrive pre-sorted by time.
	const days = $derived.by(() => {
		const map = new Map<string, ScheduleSlot[]>();
		for (const s of data.schedule) {
			const day = zonedDayLabel(s.starts_at, tz);
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(s);
		}
		return [...map.entries()];
	});
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<a href="/organizer/tournaments/{data.tournament.id}" class="text-sm text-muted hover:text-primary">← Tournament</a>
		<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">Schedule</h1>
		<p class="text-xs text-muted">Assign matches to courts and times. Each slot runs 90 minutes.</p>
	</div>
	<div class="flex gap-2">
		<Button variant="ghost" onclick={() => (courtOpen = true)}><Plus class="size-4" /> Court</Button>
		<Button onclick={openNewSlot} disabled={data.courts.length === 0}>
			<Plus class="size-4" /> Schedule match
		</Button>
	</div>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{form.error}</p>
{/if}

<!-- Courts -->
<Card class="mb-6">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Courts</h2>
		<span class="text-[11px] text-muted">{data.courts.length} court{data.courts.length === 1 ? '' : 's'}</span>
	</div>
	{#if data.courts.length === 0}
		<p class="text-sm text-muted">No courts yet — add one to start scheduling.</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each data.courts as c (c.id)}
				<span class="rounded-pill border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-primary">{c.name}</span>
			{/each}
		</div>
	{/if}
</Card>

<!-- Schedule — grouped by day -->
{#if data.schedule.length === 0}
	<EmptyState title="Nothing scheduled" message="Add courts, then assign matches to time slots." />
{:else}
	<div class="flex flex-col gap-6">
		{#each days as [day, slots] (day)}
			<div>
				<h3 class="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
					<Clock class="size-3.5" /> {day}
					<span class="font-normal normal-case tracking-normal text-muted">· {slots.length} match{slots.length === 1 ? '' : 'es'}</span>
				</h3>
				<Card padded={false}>
					<ul class="divide-y divide-border">
						{#each slots as s (s.id)}
							<li class="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-subtle">
								<span class="w-14 shrink-0 font-display text-[15px] tabular-nums text-primary">{fmtTime(s.starts_at)}</span>
								<span class="w-32 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{s.court_name}</span>
								<span class="min-w-0 flex-1 truncate text-[13px] {s.match_label ? 'text-primary' : 'text-muted'}">
									{s.match_label ?? 'Held (no match)'}
								</span>
								<div class="shrink-0">
									<RowMenu>
										<RowMenuItem onSelect={() => openEditSlot(s)}>Edit</RowMenuItem>
										<RowMenuItem danger onSelect={() => removeSlot(s.id)}>Remove</RowMenuItem>
									</RowMenu>
								</div>
							</li>
						{/each}
					</ul>
				</Card>
			</div>
		{/each}
	</div>
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

<!-- Schedule / edit match modal — one form, create or edit by `editingId`. -->
<Modal
	bind:open={slotOpen}
	title={editingId ? 'Edit slot' : 'Schedule a match'}
	description={editingId ? 'Change the court, match, or time' : 'Assign a match to a court and time'}
>
	<form
		method="POST"
		action={editingId ? '?/editSlot' : '?/addSlot'}
		use:enhance={toastEnhance({
			success: editingId ? 'Slot updated' : 'Match scheduled',
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
		<input type="hidden" name="tz" value={tz} />
		{#if editingId}<input type="hidden" name="slotId" value={editingId} />{/if}
		<Field label="Court">
			<Select name="court_id" bind:value={slotCourt} items={courtItems} placeholder="Pick a court" />
		</Field>
		<Field label="Match" hint={!editingId && assignable.length === 0 ? 'No unscheduled matches with both players set' : ''}>
			<Select name="match_id" bind:value={slotMatch} items={matchItems} placeholder="— No match (hold slot) —" />
		</Field>
		<Field label="Start">
			<DateTimePicker bind:value={slotStartsAt} />
		</Field>
		{#if form?.restWarning}
			<div class="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] text-accent">
				<p>{form.restWarning}</p>
				<label class="mt-2 flex items-center gap-2 font-bold">
					<input type="checkbox" name="override_rest" class="accent-current" />
					Schedule anyway
				</label>
			</div>
		{/if}
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (slotOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting || !slotCourt || !slotStartsAt}>
				{editingId ? 'Save changes' : 'Schedule'}
			</Button>
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
