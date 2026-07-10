<script lang="ts">
	import type { EventRow, EventBracket, Standing, GroupKnockout } from '$lib/api/endpoints/events';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';
	import Standings from '$lib/components/bracket/Standings.svelte';
	import GroupKnockoutView from '$lib/components/bracket/GroupKnockoutView.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		data,
		form
	}: {
		data: {
			event: EventRow;
			bracket: EventBracket | null;
			standings: Standing[] | null;
			groupKnockout: GroupKnockout | null;
		};
		form?: { error?: string; filled?: number };
	} = $props();

	const kind = $derived(data.event.format);
	const title = $derived(
		kind === 'round_robin' ? 'Standings' : kind === 'group_knockout' ? 'Groups & Knockout' : 'Draw'
	);
	const formatLabel: Record<string, string> = {
		single_elim: 'single elimination',
		round_robin: 'round robin',
		group_knockout: 'group → knockout'
	};
</script>

<div class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<a href="/organizer/events/{data.event.id}" class="text-sm text-muted hover:text-primary">← Event</a>
		<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">
			{data.event.name} — {title}
		</h1>
		<p class="text-xs capitalize text-muted">{data.event.discipline} · {formatLabel[kind] ?? kind}</p>
	</div>
	{#if kind === 'group_knockout'}
		<div class="text-right">
			<form
				method="POST"
				action="?/resolve"
				use:enhance={toastEnhance({ success: 'Knockout re-resolved' })}
			>
				<Button type="submit" variant="ghost" size="sm">Re-resolve knockout</Button>
			</form>
			<p class="mt-1 text-[11px] text-muted">Fills automatically when all groups finish.</p>
		</div>
	{/if}
</div>

{#if form?.error}
	<p class="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{form.error}</p>
{:else if form?.filled != null}
	<p class="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
		Filled {form.filled} knockout slot{form.filled === 1 ? '' : 's'} from group finishers.
	</p>
{/if}

{#if kind === 'group_knockout' && data.groupKnockout}
	<GroupKnockoutView data={data.groupKnockout} />
{:else if kind === 'round_robin'}
	<Standings standings={data.standings ?? []} />
{:else if data.bracket}
	<BurgundyBracket bracket={data.bracket} />
{/if}
