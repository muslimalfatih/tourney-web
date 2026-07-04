<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
</script>

<h1 class="mb-1 text-xl font-semibold text-primary">Platform overview</h1>
<p class="mb-6 text-sm text-muted">Global view across all organizers and tournaments.</p>

<div class="grid gap-4 sm:grid-cols-3">
	<Card><p class="text-sm text-muted">Organizers</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
	<Card><p class="text-sm text-muted">Tournaments</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
	<Card><p class="text-sm text-muted">Live now</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
</div>
