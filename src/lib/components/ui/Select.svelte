<script lang="ts">
	import { Select } from 'bits-ui';
	import { Check, ChevronDown } from '@lucide/svelte';

	// Burgundy single-select on the Bits UI Select primitive (accessible: typeahead,
	// keyboard nav, Floating UI positioning). `value` is a bindable string; pass
	// `name` to emit a hidden native input so it submits inside a form. Items with
	// `disabled` are shown but not selectable.
	export type SelectItem = { value: string; label: string; disabled?: boolean };

	let {
		value = $bindable(''),
		items,
		placeholder = 'Select…',
		name,
		disabled = false,
		id,
		class: klass = '',
		onValueChange
	}: {
		value?: string;
		items: SelectItem[];
		placeholder?: string;
		name?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
		// Fires with the newly-selected value. Use this (instead of bind:value)
		// when the caller stores the value in a different shape (e.g. null vs '').
		onValueChange?: (value: string) => void;
	} = $props();

	// Resolve the current value to its label ourselves — bits-ui v2's Select.Value
	// renders the raw value, not the item label.
	const selectedLabel = $derived(items.find((i) => i.value === value)?.label);
</script>

<Select.Root type="single" bind:value {name} {disabled} {onValueChange} allowDeselect>
	<Select.Trigger
		{id}
		class="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-page px-3 text-[13px] text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60 data-[state=open]:border-accent {klass}"
	>
		<span class="truncate text-left {selectedLabel ? '' : 'text-muted'}">
			{selectedLabel ?? placeholder}
		</span>
		<ChevronDown class="size-4 shrink-0 text-muted" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			sideOffset={6}
			class="motion-menu z-70 max-h-64 w-(--bits-select-anchor-width) min-w-(--bits-select-anchor-width) overflow-hidden rounded-md border border-border bg-surface shadow-(--shadow-soft)"
		>
			<Select.ScrollUpButton class="flex h-6 items-center justify-center text-muted">
				<ChevronDown class="size-3 rotate-180" />
			</Select.ScrollUpButton>
			<Select.Viewport class="p-1">
				{#each items as item (item.value)}
					<Select.Item
						value={item.value}
						label={item.label}
						disabled={item.disabled}
						class="flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2 text-[13px] text-primary outline-none data-disabled:cursor-not-allowed data-disabled:opacity-40 data-highlighted:bg-subtle data-[state=checked]:text-accent"
					>
						{#snippet children({ selected })}
							<span class="min-w-0 flex-1 truncate">{item.label}</span>
							{#if selected}
								<Check class="size-4 shrink-0 text-accent" />
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
			<Select.ScrollDownButton class="flex h-6 items-center justify-center text-muted">
				<ChevronDown class="size-3" />
			</Select.ScrollDownButton>
		</Select.Content>
	</Select.Portal>
</Select.Root>
