<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { EllipsisVertical } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	// Burgundy-styled row action menu built on the Bits UI DropdownMenu
	// primitive (accessible: focus trap, arrow-key nav, escape to close). Used
	// for Open / Edit / Duplicate / Archive on list rows.
	let { children, label = 'Row actions' }: { children: Snippet; label?: string } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		aria-label={label}
		class="inline-grid size-8 place-items-center rounded-pill border border-border text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
	>
		<EllipsisVertical class="size-4" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			sideOffset={6}
			align="end"
			class="motion-menu z-50 min-w-40 rounded-md border border-border bg-surface p-1 shadow-(--shadow-soft)"
		>
			{@render children()}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
