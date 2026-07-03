<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { Trophy } from '@lucide/svelte';

	let { form }: { form?: { email?: string; error?: string } } = $props();
	let submitting = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-bg px-4">
	<div class="w-full max-w-sm">
		<div class="mb-6 flex items-center justify-center gap-2 font-semibold text-primary">
			<Trophy class="size-6 text-accent" />
			<span class="text-lg">Laga</span>
		</div>

		<Card>
			<h1 class="text-lg font-semibold text-primary">Sign in</h1>
			<p class="mt-1 text-sm text-secondary">Organizer &amp; admin access.</p>

			<form
				method="POST"
				class="mt-6 space-y-4"
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
					<label for="email" class="text-sm font-medium text-secondary">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						value={form?.email ?? ''}
						class="h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-primary outline-none focus:border-accent"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="text-sm font-medium text-secondary">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						class="h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-primary outline-none focus:border-accent"
					/>
				</div>

				<Button type="submit" size="lg" class="w-full" disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>
		</Card>
	</div>
</div>
