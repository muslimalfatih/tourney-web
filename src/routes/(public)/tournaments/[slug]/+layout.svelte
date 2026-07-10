<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PublicTournament } from '$lib/api/types';

	// The public tournament experience lives on a single centered page (the
	// bracket route). No header band / tab nav — the page owns its own hero +
	// view switcher. This layout is just the container.
	let {
		children
	}: { data: { tournament: PublicTournament }; children: Snippet } = $props();
</script>

<div class="mx-auto max-w-6xl px-4 pb-24">
	{@render children()}
</div>
