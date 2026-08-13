<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	// Burgundy modal on the Bits UI Dialog primitive (accessible: focus trap,
	// escape to close, scroll lock, labelled title). `open` is bindable so the
	// parent controls visibility.
	let {
		open = $bindable(false),
		title,
		description = '',
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<!-- Not bg-primary/40 — --color-primary is the light TEXT ink on this dark
		     theme, so it scrimmed the page white. A scrim is always black. -->
		<Dialog.Overlay class="motion-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
		<Dialog.Content
			class="motion-modal fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-(--shadow-soft) focus-visible:outline-none"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<Dialog.Title class="font-display text-lg uppercase tracking-[0.06em] text-primary"
						>{title}</Dialog.Title
					>
					{#if description}
						<Dialog.Description class="mt-1 text-sm text-muted">{description}</Dialog.Description>
					{/if}
				</div>
				<Dialog.Close
					aria-label="Close"
					class="grid size-8 shrink-0 place-items-center rounded-pill text-muted transition-colors hover:bg-subtle hover:text-primary"
				>
					<X class="size-4" />
				</Dialog.Close>
			</div>

			{@render children()}

			{#if footer}
				<div class="mt-6 flex justify-end gap-2">{@render footer()}</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
