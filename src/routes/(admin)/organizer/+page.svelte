<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Plus } from '@lucide/svelte';
</script>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-xl font-semibold text-primary">Overview</h1>
		<p class="text-sm text-secondary">Manage your tournaments and events.</p>
	</div>
	<a href="/organizer/tournaments/new">
		<Button><Plus class="size-4" /> New tournament</Button>
	</a>
</div>

<div class="grid gap-4 sm:grid-cols-3">
	<Card><p class="text-sm text-secondary">Tournaments</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
	<Card><p class="text-sm text-secondary">Live matches</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
	<Card><p class="text-sm text-secondary">Participants</p><p class="mt-1 text-2xl font-semibold text-primary">—</p></Card>
</div>
