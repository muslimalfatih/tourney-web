<script lang="ts">
	import type { EventDivision, EventGender } from '$lib/api/types';
	import Chip from '$lib/components/ui/Chip.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	type ChangePayload = {
		category?: string | null;
		gender?: EventGender | null;
	};

	let {
		events,
		category,
		gender,
		onchange,
		card = false
	}: {
		events: EventDivision[];
		category: string | null;
		gender: EventGender | null;
		onchange: (next: ChangePayload) => void;
		// Wrap in a Card (public page). Dashboard passes card={false} and supplies
		// its own Card + the "+ Add category" affordance.
		card?: boolean;
	} = $props();

	const catOf = (e: EventDivision) => e.category?.trim() ?? '';

	// Distinct REAL categories in first-seen order (events arrive pre-sorted by
	// public_order). Uncategorised events have no chip. Show the category row only
	// when there's more than one to choose between.
	const categories = $derived([...new Set(events.map(catOf).filter((c) => c !== ''))]);
	const showCategories = $derived(categories.length > 1);

	// Gender pills are ALWAYS shown; each is disabled when the selected category
	// has no event of that gender (visible-but-inert rather than hidden). "All"
	// resets the filter and is always enabled.
	const allGenders: { value: EventGender; label: string }[] = [
		{ value: 'men', label: 'Men' },
		{ value: 'women', label: 'Women' },
		{ value: 'mixed', label: 'Mixed' }
	];
	const gendersInCat = $derived(
		new Set(events.filter((e) => category == null || catOf(e) === category).map((e) => e.gender))
	);
	const genderOptions = $derived([
		{ value: null as EventGender | null, label: 'All' },
		...allGenders.map((g) => ({ ...g, disabled: !gendersInCat.has(g.value) }))
	]);
</script>

{#snippet bar()}
	<div class="flex flex-wrap items-center justify-between gap-4">
		<!-- Category chips (left) — only the real categories, no label, no "All". -->
		{#if showCategories}
			<div class="flex flex-wrap items-center gap-2">
				{#each categories as c (c)}
					<Chip active={c === category} onclick={() => onchange({ category: c })}>{c}</Chip>
				{/each}
			</div>
		{:else}
			<span></span>
		{/if}

		<!-- Gender pills (right) — always shown; absent genders are disabled. -->
		<SegmentedControl
			options={genderOptions}
			value={gender}
			onchange={(g) => onchange({ gender: g })}
		/>
	</div>
{/snippet}

{#if card}
	<Card class="mb-8">{@render bar()}</Card>
{:else}
	{@render bar()}
{/if}
