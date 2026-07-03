<script lang="ts">
	let { label = 'Loading…' }: { label?: string } = $props();
</script>

<div class="flex items-center justify-center gap-3 py-12 text-secondary" role="status">
	<span
		class="inline-block size-5 animate-spin rounded-full border-2 border-border border-t-accent"
	></span>
	<span class="text-sm">{label}</span>
</div>
