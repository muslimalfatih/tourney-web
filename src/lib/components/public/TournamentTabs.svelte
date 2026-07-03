<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';

	let { slug }: { slug: string } = $props();

	const base = $derived(`/tournaments/${slug}`);
	const tabs = $derived([
		{ label: 'Overview', href: base },
		{ label: 'Bracket', href: `${base}/bracket` },
		{ label: 'Schedule', href: `${base}/schedule` },
		{ label: 'Participants', href: `${base}/participants` }
	]);

	function active(href: string): boolean {
		if (href === base) return page.url.pathname === base;
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="border-b border-border bg-surface">
	<div class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class={cn(
					'-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
					active(tab.href)
						? 'border-accent text-primary'
						: 'border-transparent text-secondary hover:text-primary'
				)}
			>
				{tab.label}
			</a>
		{/each}
	</div>
</nav>
