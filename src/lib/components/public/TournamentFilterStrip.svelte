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

	// Skill categories sort by ability, not first-seen: newbie → beginner →
	// intermediate → advanced → open. Anything unrecognised sorts after, alpha.
	const CATEGORY_ORDER = ['newbie', 'beginner', 'intermediate', 'advanced', 'open'];
	const catRank = (c: string) => {
		const i = CATEGORY_ORDER.indexOf(c.toLowerCase());
		return i === -1 ? CATEGORY_ORDER.length : i;
	};

	// Distinct REAL categories, ability-sorted. Uncategorised events have no chip.
	// Show the category row only when there's more than one to choose between.
	const categories = $derived(
		[...new Set(events.map(catOf).filter((c) => c !== ''))].sort(
			(a, b) => catRank(a) - catRank(b) || a.localeCompare(b)
		)
	);
	const showCategories = $derived(categories.length > 1);

	// Gender pills are ALWAYS shown; each is disabled when the selected category
	// has no event of that gender (visible-but-inert rather than hidden). No "All"
	// option — an unset gender simply lights no pill and shows every gender.
	const allGenders: { value: EventGender; label: string }[] = [
		{ value: 'men', label: 'Men' },
		{ value: 'women', label: 'Women' },
		{ value: 'mixed', label: 'Mixed' }
	];
	const gendersInCat = $derived(
		new Set(events.filter((e) => category == null || catOf(e) === category).map((e) => e.gender))
	);
	const genderOptions = $derived(
		allGenders.map((g) => ({ ...g, disabled: !gendersInCat.has(g.value) }))
	);
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
