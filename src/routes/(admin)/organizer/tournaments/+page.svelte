<script lang="ts">
	import type { Tournament, TournamentStatus } from '$lib/api/types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Plus, ExternalLink } from '@lucide/svelte';

	let { data, form }: { data: { tournaments: Tournament[] }; form?: { error?: string } } = $props();

	let statusFilter = $state<'all' | TournamentStatus>('all');
	let createOpen = $state(false);
	let submitting = $state(false);
	let statusId = $state('');

	function submitStatus(id: string, action: 'publish' | 'unpublish') {
		statusId = id;
		const f = document.getElementById('statusForm') as HTMLFormElement;
		f.action = `?/${action}`;
		f.requestSubmit();
	}

	function statusEnhance() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			await invalidateAll();
		};
	}

	const filtered = $derived(
		statusFilter === 'all'
			? data.tournaments
			: data.tournaments.filter((t) => t.status === statusFilter)
	);

	const counts = $derived({
		total: data.tournaments.length,
		published: data.tournaments.filter((t) => t.status === 'published').length
	});

	const tagTone: Record<TournamentStatus, 'draft' | 'published' | 'archived'> = {
		draft: 'draft',
		published: 'published',
		archived: 'archived',
		suspended: 'archived'
	};

	function fmtDates(t: Tournament): string {
		if (!t.starts_on) return '—';
		const s = new Date(t.starts_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		if (!t.ends_on) return s;
		const e = new Date(t.ends_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
		return `${s}–${e}`;
	}
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-2xl uppercase tracking-[0.08em] text-primary">Tournaments</h1>
		<p class="text-xs text-muted">{counts.total} total · {counts.published} published</p>
	</div>
	<Button onclick={() => (createOpen = true)}><Plus class="size-4" /> Create tournament</Button>
</div>

<!-- Filter chips -->
<div class="mb-4 flex flex-wrap items-center gap-2">
	<span class="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Status</span>
	<Chip active={statusFilter === 'all'} onclick={() => (statusFilter = 'all')}>All</Chip>
	<Chip active={statusFilter === 'draft'} onclick={() => (statusFilter = 'draft')}>Draft</Chip>
	<Chip active={statusFilter === 'published'} onclick={() => (statusFilter = 'published')}
		>Published</Chip
	>
	<Chip active={statusFilter === 'archived'} onclick={() => (statusFilter = 'archived')}
		>Archived</Chip
	>
</div>

{#if filtered.length === 0}
	<EmptyState
		title={data.tournaments.length === 0 ? 'No tournaments yet' : 'None match this filter'}
		message={data.tournaments.length === 0
			? 'Create your first tournament to get started.'
			: 'Try a different status filter.'}
	>
		{#snippet action()}
			{#if data.tournaments.length === 0}
				<Button onclick={() => (createOpen = true)}>Create tournament</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<Card padded={false}>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[600px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Tournament', 'Location', 'Dates', 'Events', 'Status', ''] as h, hi (hi)}
							<th class="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
								>{h}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each filtered as t (t.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-3 py-3 font-bold text-primary">{t.name}</td>
							<td class="px-3 py-3 text-muted">{t.location ?? '—'}</td>
							<td class="tabular px-3 py-3 text-muted">{fmtDates(t)}</td>
							<td class="tabular px-3 py-3">{t.event_count ?? 0}</td>
							<td class="px-3 py-3"><Tag tone={tagTone[t.status]}>{t.status}</Tag></td>
							<td class="px-3 py-3">
								<div class="flex items-center justify-end gap-1">
									<a href="/organizer/tournaments/{t.id}"><Button variant="ghost" size="sm">Open</Button></a>
									<RowMenu>
										<RowMenuItem onSelect={() => (window.location.href = `/organizer/tournaments/${t.id}`)}>
											Edit
										</RowMenuItem>
										{#if t.status === 'published'}
											<RowMenuItem onSelect={() => submitStatus(t.id, 'unpublish')}>Unpublish</RowMenuItem>
										{:else}
											<RowMenuItem onSelect={() => submitStatus(t.id, 'publish')}>Publish</RowMenuItem>
										{/if}
									</RowMenu>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<!-- Hidden forms for row-menu status actions (progressive-enhancement friendly) -->
<form id="statusForm" method="POST" use:enhance={statusEnhance} class="hidden">
	<input type="hidden" name="id" bind:value={statusId} />
</form>

<!-- Create modal -->
<Modal bind:open={createOpen} title="New tournament" description="Tennis · single or multi-division">
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') {
					createOpen = false;
					await invalidateAll();
				}
			};
		}}
		class="flex flex-col gap-4"
	>
		{#if form?.error}
			<p class="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
				{form.error}
			</p>
		{/if}
		<Field label="Name"><input name="name" required class={inputClass} placeholder="Bali Open 2026" /></Field>
		<Field label="Location"><input name="location" class={inputClass} placeholder="Canggu, Bali" /></Field>
		<div class="grid grid-cols-2 gap-3">
			<Field label="Start date"><input name="starts_on" type="date" class={inputClass} /></Field>
			<Field label="End date"><input name="ends_on" type="date" class={inputClass} /></Field>
		</div>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (createOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
		</div>
	</form>
</Modal>
