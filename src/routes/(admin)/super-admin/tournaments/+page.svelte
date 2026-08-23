<script lang="ts">
	import type { GlobalTournament } from '$lib/api/endpoints/admin';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import RowMenu from '$lib/components/ui/RowMenu.svelte';
	import RowMenuItem from '$lib/components/ui/RowMenuItem.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data }: { data: { tournaments: GlobalTournament[] } } = $props();

	let actId = $state('');
	let actKind = $state('');
	function act(id: string, action: string) {
		actId = id;
		actKind = action;
		(document.getElementById('oversightForm') as HTMLFormElement).requestSubmit();
	}

	const tone = (s: string) =>
		s === 'published' ? 'published' : s === 'suspended' || s === 'archived' ? 'archived' : 'draft';
</script>

<div class="mb-6">
	<h1 class="font-display text-3xl tracking-[-0.01em] text-primary">All tournaments</h1>
	<p class="text-xs text-muted">Every organizer's tournaments. Suspend or archive as needed.</p>
</div>

{#if data.tournaments.length === 0}
	<EmptyState title="No tournaments yet" message="Tournaments created by any organizer appear here." />
{:else}
	<Card padded={false}>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[600px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Tournament', 'Organization', 'Status', ''] as h, hi (hi)}
							<th class="px-5 py-2.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.tournaments as t (t.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-5 py-3 font-bold text-primary">{t.name}</td>
							<td class="px-5 py-3 text-muted">{t.org_name}</td>
							<td class="px-5 py-3"><Tag tone={tone(t.status)}>{t.status}</Tag></td>
							<td class="px-5 py-3 text-right">
								<RowMenu>
									{#if t.status === 'suspended' || t.status === 'archived'}
										<RowMenuItem onSelect={() => act(t.id, 'restore')}>Restore to draft</RowMenuItem>
									{:else}
										<RowMenuItem onSelect={() => act(t.id, 'suspend')}>Suspend</RowMenuItem>
										<RowMenuItem danger onSelect={() => act(t.id, 'archive')}>Archive</RowMenuItem>
									{/if}
								</RowMenu>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<form
	id="oversightForm"
	method="POST"
	action="?/oversight"
	class="hidden"
	use:enhance={toastEnhance({ success: 'Tournament updated', reset: true })}
>
	<input type="hidden" name="id" bind:value={actId} />
	<input type="hidden" name="action" bind:value={actKind} />
</form>
