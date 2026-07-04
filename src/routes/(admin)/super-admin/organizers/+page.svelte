<script lang="ts">
	import type { Organization } from '$lib/api/endpoints/admin';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Plus } from '@lucide/svelte';

	let {
		data,
		form
	}: { data: { organizations: Organization[] }; form?: { error?: string } } = $props();

	let createOpen = $state(false);
	let submitting = $state(false);
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="font-display text-2xl uppercase tracking-[0.08em] text-primary">Organizers</h1>
		<p class="text-xs text-muted">{data.organizations.length} organization{data.organizations.length === 1 ? '' : 's'}</p>
	</div>
	<Button onclick={() => (createOpen = true)}><Plus class="size-4" /> Add organizer</Button>
</div>

{#if data.organizations.length === 0}
	<EmptyState title="No organizations yet" message="Create an organization and its first organizer account.">
		{#snippet action()}
			<Button onclick={() => (createOpen = true)}>Add organizer</Button>
		{/snippet}
	</EmptyState>
{:else}
	<Card padded={false}>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[560px] border-collapse text-[13px]">
				<thead>
					<tr class="border-b border-border text-left">
						{#each ['Organization', 'Slug', 'Organizers', 'Tournaments', 'Status'] as h (h)}
							<th class="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.organizations as o (o.id)}
						<tr class="border-b border-border transition-colors hover:bg-subtle">
							<td class="px-5 py-3 font-bold text-primary">{o.name}</td>
							<td class="px-5 py-3 text-muted">/{o.slug}</td>
							<td class="tabular px-5 py-3">{o.organizer_count}</td>
							<td class="tabular px-5 py-3">{o.tournament_count}</td>
							<td class="px-5 py-3"><Tag tone={o.status === 'active' ? 'published' : 'archived'}>{o.status}</Tag></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<Modal
	bind:open={createOpen}
	title="Add organization"
	description="Creates an org and its first organizer login"
>
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
		<Field label="Organization name"><input name="org_name" required class={inputClass} placeholder="Jakarta Sports Club" /></Field>
		<div class="grid grid-cols-2 gap-3">
			<Field label="Organizer name"><input name="organizer_name" required class={inputClass} /></Field>
			<Field label="Organizer email"><input name="organizer_email" type="email" required class={inputClass} /></Field>
		</div>
		<Field label="Temporary password" hint="8+ characters; share it with the organizer">
			<input name="password" type="text" required minlength="8" class={inputClass} />
		</Field>
		<div class="mt-2 flex justify-end gap-2">
			<Button type="button" variant="ghost" onclick={() => (createOpen = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</Button>
		</div>
	</form>
</Modal>
