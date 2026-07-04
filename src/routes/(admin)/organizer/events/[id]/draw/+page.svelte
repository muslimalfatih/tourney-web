<script lang="ts">
	import type { EventRow } from '$lib/api/endpoints/events';
	import type { EventBracket } from '$lib/api/endpoints/events';
	import BurgundyBracket from '$lib/components/bracket/BurgundyBracket.svelte';

	let { data }: { data: { event: EventRow; bracket: EventBracket } } = $props();
</script>

<div class="mb-6">
	<a
		href="/organizer/events/{data.event.id}"
		class="text-sm text-muted transition-colors hover:text-primary">← Event</a
	>
	<h1 class="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-primary">
		{data.event.name} — Draw
	</h1>
	<p class="text-xs capitalize text-muted">
		{data.event.discipline} · single elimination
	</p>
</div>

<BurgundyBracket bracket={data.bracket} />
