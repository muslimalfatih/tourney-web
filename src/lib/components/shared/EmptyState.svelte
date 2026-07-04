<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title = 'Nothing here yet',
		message = '',
		action
	}: { title?: string; message?: string; action?: Snippet } = $props();
</script>

<div
	class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-accent-soft py-12 text-center"
>
	<p class="font-medium text-primary">{title}</p>
	{#if message}<p class="max-w-sm text-sm text-muted">{message}</p>{/if}
	{#if action}<div class="mt-2">{@render action()}</div>{/if}
</div>
