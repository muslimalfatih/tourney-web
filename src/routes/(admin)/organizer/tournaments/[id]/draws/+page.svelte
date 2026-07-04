<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { page } from '$app/state';
	const id = $derived(page.params.id);
</script>

<a href="/organizer/tournaments/{id}" class="text-sm text-muted hover:text-primary">← Tournament</a>
<h1 class="mb-6 mt-2 text-xl font-semibold text-primary">Draws</h1>

<EmptyState
	title="No draw generated"
	message="Generate a bracket once an event has participants. Single elimination ships first, then round robin and group → knockout."
/>
