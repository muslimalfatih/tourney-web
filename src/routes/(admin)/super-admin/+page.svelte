<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import { Building2, Trophy, ScrollText } from '@lucide/svelte';

	let {
		data
	}: { data: { stats: { organizations: number; tournaments: number; published: number } } } =
		$props();

	const links = [
		{ label: 'Organizers', href: '/super-admin/organizers', icon: Building2, desc: 'Manage organizations and their accounts' },
		{ label: 'Tournaments', href: '/super-admin/tournaments', icon: Trophy, desc: 'Global oversight — suspend or archive' },
		{ label: 'Audit log', href: '/super-admin/audit', icon: ScrollText, desc: 'Critical changes across the platform' }
	];
</script>

<h1 class="mb-1 font-display text-3xl tracking-[-0.01em] text-primary">Platform overview</h1>
<p class="mb-6 text-xs text-muted">Global view across all organizers and tournaments.</p>

<div class="mb-8 grid gap-4 sm:grid-cols-3">
	{#each [{ l: 'Organizations', n: data.stats.organizations }, { l: 'Tournaments', n: data.stats.tournaments }, { l: 'Published', n: data.stats.published }] as s (s.l)}
		<Card>
			<p class="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-muted">{s.l}</p>
			<p class="mt-1 font-display text-3xl tabular-nums text-accent">{s.n}</p>
		</Card>
	{/each}
</div>

<div class="grid gap-3 sm:grid-cols-3">
	{#each links as l (l.href)}
		<a href={l.href}>
			<Card class="h-full transition-colors hover:border-accent/50">
				<l.icon class="size-5 text-accent" />
				<p class="mt-3 font-bold text-primary">{l.label}</p>
				<p class="mt-1 text-xs text-muted">{l.desc}</p>
			</Card>
		</a>
	{/each}
</div>
