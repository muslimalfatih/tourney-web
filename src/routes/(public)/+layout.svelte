<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Trophy } from '@lucide/svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col bg-bg">
	<div
		class="sticky top-0 z-30 border-b border-border/60 bg-page/80 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0px))]:bg-page"
	>
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
			<a href="/" class="flex items-center gap-2 font-semibold text-primary">
				<Trophy class="size-5 text-accent" />
				Laga
			</a>
		</div>
	</div>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-border/60 py-6">
		<div class="mx-auto max-w-6xl px-4 text-xs text-muted">
			Powered by Laga — white-label tournament platform.
		</div>
	</footer>
</div>
