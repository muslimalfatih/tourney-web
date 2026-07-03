<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	// Schedule rendering lands in milestone 2 (courts + slots). The public read
	// endpoint shape is defined in the contract; this page consumes it once the
	// backend returns slots.
</script>

<h2 class="mb-4 text-lg font-semibold text-primary">Schedule</h2>
<EmptyState
	title="Schedule not published yet"
	message="Court assignments and match times will appear here once the organizer publishes them."
/>
