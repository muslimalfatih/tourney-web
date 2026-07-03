<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Trophy } from '@lucide/svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col bg-bg">
	<div class="border-b border-border/60">
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
		<div class="mx-auto max-w-6xl px-4 text-xs text-secondary">
			Powered by Laga — white-label tournament platform.
		</div>
	</footer>
</div>
