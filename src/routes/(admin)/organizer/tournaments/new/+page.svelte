<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		form
	}: { form?: { name?: string; slug?: string; location?: string; error?: string } } = $props();
	let submitting = $state(false);

	const inputClass =
		'h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-primary outline-none focus:border-accent';
</script>

<div class="mb-6">
	<a href="/organizer/tournaments" class="text-sm text-secondary hover:text-primary">← Tournaments</a>
	<h1 class="mt-2 text-xl font-semibold text-primary">New tournament</h1>
</div>

<div class="max-w-lg">
	<Card>
		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if form?.error}
				<p class="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
					{form.error}
				</p>
			{/if}

			<div class="space-y-1.5">
				<label for="name" class="text-sm font-medium text-secondary">Name</label>
				<input id="name" name="name" required value={form?.name ?? ''} class={inputClass} />
			</div>

			<div class="space-y-1.5">
				<label for="slug" class="text-sm font-medium text-secondary">Slug</label>
				<input
					id="slug"
					name="slug"
					required
					placeholder="bali-open"
					value={form?.slug ?? ''}
					class={inputClass}
				/>
				<p class="text-xs text-secondary">Used in the public URL: /tournaments/&lt;slug&gt;</p>
			</div>

			<div class="space-y-1.5">
				<label for="location" class="text-sm font-medium text-secondary">Location (optional)</label>
				<input id="location" name="location" value={form?.location ?? ''} class={inputClass} />
			</div>

			<Button type="submit" disabled={submitting}>
				{submitting ? 'Creating…' : 'Create tournament'}
			</Button>
		</form>
	</Card>
</div>
