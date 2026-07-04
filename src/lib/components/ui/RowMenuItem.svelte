<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	let {
		onSelect,
		danger = false,
		children
	}: { onSelect?: () => void; danger?: boolean; children: Snippet } = $props();
</script>

<DropdownMenu.Item
	onSelect={() => onSelect?.()}
	class={cn(
		'flex cursor-pointer items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] outline-none data-highlighted:bg-subtle',
		danger ? 'text-danger' : 'text-primary'
	)}
>
	{@render children()}
</DropdownMenu.Item>
