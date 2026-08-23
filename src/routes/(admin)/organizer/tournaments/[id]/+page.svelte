<script lang="ts">
	import type { Tournament } from '$lib/api/types';
	import type { EventRow } from '$lib/api/endpoints/events';
	import { enhance } from '$app/forms';
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import type { EventGender } from '$lib/api/types';
	import { Plus, Users, GitBranch, Calendar, ExternalLink } from '@lucide/svelte';

	let {
		data,
		form
	}: {
		data: { tournament: Tournament; events: EventRow[] };
		form?: { error?: string };
	} = $props();

	let addOpen = $state(false);
	let submitting = $state(false);
	let deleteId = $state('');

	const formatLabel: Record<string, string> = {
		single_elim: 'Single elim',
		round_robin: 'Round robin',
		group_knockout: 'Group → KO'
	};

	function deleteEvent(id: string) {
		deleteId = id;
		const f = document.getElementById('delEventForm') as HTMLFormElement;
		f.requestSubmit();
	}

	// --- Filter bar (category / gender / phase), mirrors the public page ---
	// Distinct categories present across this tournament's events (uncategorised
	// events group under an explicit bucket so they stay reachable).
	const UNCATEGORISED = '__none__';
	const categories = $derived([
		...new Set(data.events.map((e) => e.category?.trim() || UNCATEGORISED))
	]);
	let catFilter = $state<string | null>(null); // null = all
	let genderFilter = $state<EventGender | null>(null); // null = all
	let phaseFilter = $state<'group' | 'knockout' | null>(null); // null = all

	const filtered = $derived(
		data.events.filter((e) => {
			if (catFilter !== null && (e.category?.trim() || UNCATEGORISED) !== catFilter) return false;
			if (genderFilter !== null && e.gender !== genderFilter) return false;
			if (phaseFilter === 'group' && !e.has_group_stage) return false;
			if (phaseFilter === 'knockout' && !e.has_knockout_stage) return false;
			return true;
		})
	);

	const catLabel = (c: string) => (c === UNCATEGORISED ? 'Uncategorised' : c);
	const genders: EventGender[] = ['men', 'women', 'mixed'];

	// Fixed category set for new events (skill levels). Existing events with other
	// values still display in the table/filter; new ones pick from this list.
	const CATEGORY_OPTIONS = ['Newbie', 'Beginner', 'Intermediate', 'Advanced', 'Open'];
</script>

<!-- Header -->
<div class="mb-6">
	<a href="/organizer/tournaments" class="text-sm text-muted transition-colors hover:text-primary"
		>← Tournaments</a
	>
	<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="font-display text-3xl tracking-[-0.01em] text-primary">
				{data.tournament.name}
			</h1>
			<p class="text-xs text-muted">
				<span class="capitalize">{data.tournament.sport}</span>
				{#if data.tournament.location}· {data.tournament.location}{/if}
				· /{data.tournament.slug}
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if data.tournament.status === 'published'}
				<a
					href="/tournaments/{data.tournament.slug}/bracket"
					target="_blank"
					rel="noopener"
				>
					<Button variant="ghost" size="sm"><ExternalLink class="size-4" /> View public page</Button>
				</a>
			{/if}
			<Tag
				tone={data.tournament.status === 'published' ? 'published' : 'draft'}
				class="text-[11px]">{data.tournament.status}</Tag
			>
		</div>
	</div>
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
		{form.error}
	</p>
{/if}

<!-- Filter bar: category / gender / phase — shared pill controls, same as public. -->
{#if data.events.length > 0}
	<Card class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<span class="mr-1 text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">Category</span>
			<Chip active={catFilter === null} onclick={() => (catFilter = null)}>All</Chip>
			{#each categories as c (c)}
				<Chip active={catFilter === c} onclick={() => (catFilter = c)}>{catLabel(c)}</Chip>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2">
				<span class="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">Gender</span>
				<SegmentedControl
					options={[
						{ value: null, label: 'All' },
						{ value: 'men', label: 'Men' },
						{ value: 'women', label: 'Women' },
						{ value: 'mixed', label: 'Mixed' }
					]}
					value={genderFilter}
					onchange={(g) => (genderFilter = g as EventGender | null)}
					size="sm"
				/>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">Phase</span>
				<SegmentedControl
					options={[
						{ value: null, label: 'All' },
						{ value: 'group', label: 'Group' },
						{ value: 'knockout', label: 'Knockout' }
					]}
					value={phaseFilter}
					onchange={(p) => (phaseFilter = p as 'group' | 'knockout' | null)}
					size="sm"
				/>
			</div>
		</div>
	</Card>
{/if}

<!-- Events / divisions card -->
<Card padded={false} class="mb-6">
	<div class="flex items-center justify-between border-b border-border px-5 py-4">
		<h2 class="font-display text-[17px] tracking-[-0.01em] text-primary">
			Events &amp; divisions
		</h2>
		<Button variant="ghost" size="sm" onclick={() => (addOpen = true)}
			><Plus class="size-4" /> Add event</Button
		>
	</div>

	{#if data.events.length === 0}
		<div class="p-5">
			<EmptyState
				title="No divisions yet"
				message="Create a division (e.g. Men's Singles Open) and choose its format."
			/>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[640px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Division', 'Category', 'Gender', 'Format', 'Teams', 'Public', ''] as h, hi (hi)}
							<th class="px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted"
								>{h}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each filtered as ev (ev.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-5 py-3 font-bold text-primary">{ev.name}</td>
							<td class="px-5 py-3 text-muted">{ev.category?.trim() || '—'}</td>
							<td class="px-5 py-3 capitalize text-muted">{ev.gender}</td>
							<td class="px-5 py-3 text-muted">{formatLabel[ev.format] ?? ev.format}</td>
							<td class="tabular px-5 py-3">{ev.participant_count}</td>
							<td class="px-5 py-3">
								<Tag tone={ev.is_public ? 'published' : 'draft'} class="text-[10px]"
									>{ev.is_public ? 'Public' : 'Hidden'}</Tag
								>
							</td>
							<td class="px-5 py-3">
								<div class="flex items-center justify-end gap-1">
									<a href="/organizer/events/{ev.id}"
										><Button variant="ghost" size="sm">Configure</Button></a
									>
									<RowMenu>
										<RowMenuItem onSelect={() => (window.location.href = `/organizer/events/${ev.id}`)}>
											Configure &amp; draw
										</RowMenuItem>
										<RowMenuItem
											onSelect={() => (window.location.href = `/organizer/events/${ev.id}?tab=public`)}
										>
											Public settings
										</RowMenuItem>
										<RowMenuItem danger onSelect={() => deleteEvent(ev.id)}>Delete</RowMenuItem>
									</RowMenu>
								</div>
							</td>
						</tr>
					{/each}
					{#if filtered.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-8 text-center text-sm text-muted">
								No divisions match this filter.
								<button
									type="button"
									class="text-accent underline-offset-2 hover:underline"
									onclick={() => {
										catFilter = null;
										genderFilter = null;
										phaseFilter = null;
									}}>Clear filters</button
								>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<!-- Quick links to the other management surfaces -->
<div class="mb-6 grid gap-3 sm:grid-cols-3">
	<a href="/organizer/tournaments/{data.tournament.id}/participants" class="group">
		<Card class="flex items-center gap-3 transition-colors group-hover:border-accent/50">
			<Users class="size-5 text-muted transition-colors group-hover:text-accent" />
			<span class="font-bold text-primary">Participants &amp; teams</span>
		</Card>
	</a>
	<a href="/organizer/tournaments/{data.tournament.id}/schedule" class="group">
		<Card class="flex items-center gap-3 transition-colors group-hover:border-accent/50">
			<Calendar class="size-5 text-muted transition-colors group-hover:text-accent" />
			<span class="font-bold text-primary">Schedule</span>
		</Card>
	</a>
	<a href="/organizer/tournaments/{data.tournament.id}/matches" class="group">
		<Card class="flex items-center gap-3 transition-colors group-hover:border-accent/50">
			<GitBranch class="size-5 text-muted transition-colors group-hover:text-accent" />
			<span class="font-bold text-primary">Matches</span>
		</Card>
	</a>
</div>

<!-- Publish block -->
<div
	class="flex flex-wrap items-center gap-4 rounded-md border border-border bg-subtle p-4"
>
	<div class="grow">
		{#key data.tournament.status}
			<span in:scale={{ start: 0.92, duration: 200, easing: backOut }} class="inline-block">
				<Tag tone={data.tournament.status === 'published' ? 'published' : 'draft'}
					>{data.tournament.status}</Tag
				>
			</span>
		{/key}
		<p class="mt-1.5 text-[13px] text-muted">
			Publishing makes the public bracket, schedule and participant pages live.
		</p>
	</div>
	<form
		method="POST"
		action={data.tournament.status === 'published' ? '?/unpublish' : '?/publish'}
		use:enhance={toastEnhance({ success: 'Status updated' })}
	>
		{#if data.tournament.status === 'published'}
			<Button type="submit" variant="ghost">Unpublish</Button>
		{:else}
			<Button type="submit">Publish tournament</Button>
		{/if}
	</form>
</div>

<!-- Add event modal -->
<Modal bind:open={addOpen} title="Add event / division" description="Choose discipline and format">
	<form
		method="POST"
		action="?/addEvent"
		use:enhance={toastEnhance({
			success: 'Event added',
			before: () => {
				submitting = true;
			},
			onSuccess: () => {
				addOpen = false;
			},
			settle: () => {
				submitting = false;
			}
		})}
		class="flex flex-col gap-4"
	>
		<Field label="Name"><input name="name" required class={inputClass} placeholder="Men's Singles Open" /></Field>
		<div class="grid grid-cols-2 gap-3">
			<Field label="Discipline">
				<select name="discipline" class={inputClass}>
					<option value="singles">Singles</option>
					<option value="doubles">Doubles</option>
				</select>
			</Field>
			<Field label="Format">
				<select name="format" class={inputClass}>
					<option value="single_elim">Single elimination</option>
					<option value="round_robin">Round robin</option>
					<option value="group_knockout">Group → knockout</option>
				</select>
			</Field>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Field label="Category">
				<select name="category" class={inputClass}>
					{#each CATEGORY_OPTIONS as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
			</Field>
			<Field label="Gender">
				<select name="gender" class={inputClass}>
					<option value="men">Men</option>
					<option value="women">Women</option>
					<option value="mixed" selected>Mixed</option>
				</select>
			</Field>
		</div>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (addOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add event'}</Button>
		</div>
	</form>
</Modal>

<!-- Hidden delete form -->
<form
	id="delEventForm"
	method="POST"
	action="?/deleteEvent"
	class="hidden"
	use:enhance={toastEnhance({ success: 'Event removed' })}
>
	<input type="hidden" name="eventId" bind:value={deleteId} />
</form>
