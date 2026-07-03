<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/state';
	const id = $derived(page.params.id);
</script>

<a href="/organizer/tournaments/{id}" class="text-sm text-secondary hover:text-primary">← Tournament</a>
<h1 class="mb-6 mt-2 text-xl font-semibold text-primary">Events / divisions</h1>

<EmptyState
	title="No divisions yet"
	message="Create a division (e.g. Men's Singles Open) and choose its format."
>
	{#snippet action()}
		<Button disabled>Add division (milestone 1)</Button>
	{/snippet}
</EmptyState>
