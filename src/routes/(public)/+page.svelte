<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { ArrowRight } from '@lucide/svelte';

	// Landing is intentionally minimal for the MVP. A public directory of
	// tournaments can be added once the list endpoint exists. For now it points
	// visitors at a tournament by slug.
</script>

<section class="mx-auto max-w-3xl px-4 py-20 text-center">
	<h1 class="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
		Tournaments, done right.
	</h1>
	<p class="mx-auto mt-4 max-w-xl text-muted">
		Live brackets, schedules and results for tennis events — clean, fast and
		mobile-friendly.
	</p>

	<div class="mt-10 text-left">
		<Card>
			<p class="text-sm text-muted">Example tournament</p>
			<a
				href="/tournaments/bali-open"
				class="mt-1 flex items-center justify-between font-medium text-primary hover:text-accent"
			>
				View the Bali Open
				<ArrowRight class="size-4" />
			</a>
		</Card>
	</div>
</section>
