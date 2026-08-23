<script lang="ts">
	import type { EventDivision, EventGender } from '$lib/api/types';
	import Select, { type SelectItem } from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	type ChangePayload = {
		category?: string | null;
		gender?: EventGender | null;
	};

	let {
		events,
		eventId,
		onchange,
		card = false
	}: {
		events: EventDivision[];
		// Which division is active, by id — precise selection, no re-deriving a
		// match from category/gender inside this component.
		eventId: string | null;
		onchange: (next: ChangePayload) => void;
		// Wrap in a Card (public page). Dashboard passes card={false} and supplies
		// its own Card + the "+ Add category" affordance.
		card?: boolean;
	} = $props();

	// ONE flat list of the real divisions, not two independent level/gender
	// axes. Two crossed pickers implied a grid the tournament doesn't fill —
	// most cells are empty, and picking a value on one axis could silently
	// re-resolve the other to keep a division that exists. A flat list can
	// only ever offer a division that's actually there, so there's nothing
	// left to silently resolve. Matches how real tournament sites do this:
	// the US Open site (per USTA's own help docs) has visitors "select the
	// event you are playing in from the drop-down" — one control, a named
	// list — not crossed filters.
	const catOf = (e: EventDivision) => e.category?.trim() ?? '';

	// Skill categories sort by ability, not first-seen: newbie → beginner →
	// intermediate → advanced → open. Anything unrecognised sorts after, alpha.
	const CATEGORY_ORDER = ['newbie', 'beginner', 'intermediate', 'advanced', 'open'];
	const catRank = (c: string) => {
		const i = CATEGORY_ORDER.indexOf(c.toLowerCase());
		return i === -1 ? CATEGORY_ORDER.length : i;
	};
	const GENDER_ORDER: EventGender[] = ['men', 'women', 'mixed'];
	const genderLabel: Record<EventGender, string> = { men: 'Men', women: 'Women', mixed: 'Mixed' };

	// Label is level + gender, not the division's own name — the name/display
	// name is already the page's hero title above this control, so repeating
	// it here would say the same thing twice for the one division already
	// selected, and add nothing for the others.
	const items: SelectItem[] = $derived(
		[...events]
			.sort(
				(a, b) =>
					catRank(catOf(a)) - catRank(catOf(b)) ||
					GENDER_ORDER.indexOf(a.gender) - GENDER_ORDER.indexOf(b.gender)
			)
			.map((e) => ({
				value: e.id,
				label: [catOf(e), genderLabel[e.gender]].filter(Boolean).join(' · ') || e.name
			}))
	);

	// Nothing to choose between a single division — same "only show a control
	// when there's a real decision" rule the old two-axis version applied.
	const showPicker = $derived(events.length > 1);

	function handleChange(id: string) {
		const ev = events.find((e) => e.id === id);
		if (ev) onchange({ category: ev.category ?? null, gender: ev.gender });
	}
</script>

{#snippet picker()}
	<div class="max-w-xs">
		<span class="mb-2 block text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">
			Division
		</span>
		<Select value={eventId ?? ''} {items} onValueChange={handleChange} placeholder="Select a division" />
	</div>
{/snippet}

{#if showPicker}
	{#if card}
		<Card class="mb-8">{@render picker()}</Card>
	{:else}
		{@render picker()}
	{/if}
{/if}
