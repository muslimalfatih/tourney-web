<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	// Participants listing lands in milestone 1. The public list endpoint is
	// defined; this page renders it once participants are registered.
</script>

<h2 class="mb-4 text-lg font-semibold text-primary">Participants</h2>
<EmptyState
	title="No participants listed yet"
	message="Registered players and teams will appear here."
/>
