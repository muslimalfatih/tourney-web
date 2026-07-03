<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-xl font-semibold text-primary">Organizers</h1>
	<Button disabled>Add organizer (milestone 4)</Button>
</div>

<EmptyState title="No organizers yet" message="Create organizer accounts and their organizations." />
