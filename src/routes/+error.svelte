<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';

	// One calm error surface for every route error (404s from loaders, 502s
	// when laga-api is unreachable). Without this file SvelteKit renders its
	// unstyled default page, which reads as a crash rather than a state.
	const status = $derived(page.status);
	const heading = $derived(status === 404 ? 'Not found' : 'Something went wrong');
	const detail = $derived(
		status === 404
			? "This page doesn't exist — the link may be old, or the tournament was unpublished."
			: (page.error?.message ?? 'The server could not be reached. Try again in a moment.')
	);
</script>

<div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
	<p class="font-display text-[11px] uppercase tracking-[0.18em] text-muted">{status}</p>
	<h1 class="font-display text-2xl uppercase tracking-[0.08em] text-primary" style="text-wrap: balance">
		{heading}
	</h1>
	<p class="text-[14px] leading-relaxed text-muted" style="text-wrap: pretty">{detail}</p>
	<div class="mt-2 flex gap-2">
		<Button variant="ghost" onclick={() => history.back()}>Go back</Button>
		<Button onclick={() => (location.href = '/')}>Home</Button>
	</div>
</div>
