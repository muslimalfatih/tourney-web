<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { page } from '$app/state';
	import { Users, GitBranch, Calendar, ListChecks, Trophy } from '@lucide/svelte';

	const id = $derived(page.params.id);
	const sections = $derived([
		{ label: 'Events / divisions', href: `/organizer/tournaments/${id}/events`, icon: Trophy },
		{ label: 'Participants', href: `/organizer/tournaments/${id}/participants`, icon: Users },
		{ label: 'Draws', href: `/organizer/tournaments/${id}/draws`, icon: GitBranch },
		{ label: 'Schedule', href: `/organizer/tournaments/${id}/schedule`, icon: Calendar },
		{ label: 'Matches', href: `/organizer/tournaments/${id}/matches`, icon: ListChecks }
	]);
</script>

<div class="mb-6">
	<a href="/organizer/tournaments" class="text-sm text-secondary hover:text-primary">← Tournaments</a>
	<h1 class="mt-2 text-xl font-semibold text-primary">Tournament</h1>
	<p class="text-sm text-secondary">Configure divisions, draws, schedule and scoring.</p>
</div>

<div class="grid gap-3 sm:grid-cols-2">
	{#each sections as s (s.href)}
		<a href={s.href}>
			<Card class="flex items-center gap-3 transition-colors hover:border-accent/50">
				<s.icon class="size-5 text-accent" />
				<span class="font-medium text-primary">{s.label}</span>
			</Card>
		</a>
	{/each}
</div>
