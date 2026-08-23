<script lang="ts">
	import type { GroupKnockout } from '$lib/api/endpoints/events';
	import Standings from './Standings.svelte';
	import PagedKnockoutBracket from './PagedKnockoutBracket.svelte';
	import { adaptBracketRounds } from '$lib/utils/bracket-adapter';

	let {
		data,
		matchHref,
		timezone
	}: { data: GroupKnockout; matchHref?: (id: string) => string; timezone?: string } = $props();

	// data.knockout is already a real elimination tree (same shape used on the
	// public bracket page's knockout view) — adapt it directly. timezone is the
	// tournament's IANA zone for match date/time labels; callers without it
	// (organizer draw preview) fall back to the platform default.
	const adaptedKnockoutRounds = $derived(adaptBracketRounds(data.knockout, timezone));
	const hasKnockout = $derived(data.knockout.some((r) => r.matches.length > 0));
</script>

<div class="space-y-8">
	<section>
		<h3 class="mb-3 text-[11px] font-mono font-medium uppercase tracking-[0.16em] text-accent">Group stage</h3>
		<div class="grid gap-4 md:grid-cols-2">
			{#each data.groups as group (group.name)}
				<div>
					<p class="mb-2 font-display text-[15px] tracking-[-0.005em] text-primary">
						{group.name}
					</p>
					<Standings standings={group.standings} />
				</div>
			{/each}
		</div>
	</section>

	{#if hasKnockout}
		<section>
			<h3 class="mb-3 text-[11px] font-mono font-medium uppercase tracking-[0.16em] text-accent">Knockout</h3>
			<PagedKnockoutBracket rounds={adaptedKnockoutRounds} {matchHref} />
		</section>
	{/if}
</div>
