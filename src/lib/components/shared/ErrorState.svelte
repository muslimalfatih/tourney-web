<script lang="ts">
	import { TriangleAlert } from '@lucide/svelte';
	let {
		title = 'Something went wrong',
		message = 'Please try again in a moment.'
	}: { title?: string; message?: string } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
	<TriangleAlert class="size-6 text-danger" />
	<p class="font-medium text-primary">{title}</p>
	<p class="max-w-sm text-sm text-muted">{message}</p>
</div>
