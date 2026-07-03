<script lang="ts">
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
</script>

<h1 class="mb-6 text-xl font-semibold text-primary">All tournaments</h1>

<EmptyState
	title="No tournaments yet"
	message="Every organizer's tournaments appear here. You can suspend or archive any of them."
/>
