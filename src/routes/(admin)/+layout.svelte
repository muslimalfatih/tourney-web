<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { User } from '$lib/api/types';
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';
	import { Trophy, LayoutDashboard, Users, LogOut, ScrollText } from '@lucide/svelte';

	let { data, children }: { data: { user: User }; children: Snippet } = $props();

	// Nav differs by role. Organizer routes and super-admin routes are separate
	// trees; we show the set matching the signed-in user.
	const nav = $derived(
		data.user.role === 'super_admin'
			? [
					{ label: 'Overview', href: '/super-admin', icon: LayoutDashboard },
					{ label: 'Organizers', href: '/super-admin/organizers', icon: Users },
					{ label: 'Tournaments', href: '/super-admin/tournaments', icon: Trophy },
						{ label: 'Audit log', href: '/super-admin/audit', icon: ScrollText }
				]
			: [
					{ label: 'Overview', href: '/organizer', icon: LayoutDashboard },
					{ label: 'Tournaments', href: '/organizer/tournaments', icon: Trophy }
				]
	);

	function active(href: string): boolean {
		return href === '/organizer' || href === '/super-admin'
			? page.url.pathname === href
			: page.url.pathname.startsWith(href);
	}
</script>

<div class="flex min-h-screen bg-page">
	<aside class="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
		<div
			class="flex items-center gap-2 px-5 py-4 font-display text-[15px] font-bold uppercase tracking-[0.14em] text-accent"
		>
			<Trophy class="size-5" />
			Laga
		</div>
		<nav class="space-y-1 px-3">
			{#each nav as item (item.label)}
				<a
					href={item.href}
					class={cn(
						'flex items-center gap-2 rounded-pill px-3 py-2 text-[13px] transition-[color,background-color,transform] duration-100 ease-out active:scale-[0.98] motion-reduce:active:scale-100',
						active(item.href)
							? 'bg-accent text-on-accent'
							: 'text-primary hover:bg-subtle'
					)}
				>
					<item.icon class="size-4" />
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-page/80 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0px))]:bg-page"
		>
			<span class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
				{data.user.role === 'super_admin' ? 'Super Admin' : 'Organizer'}
			</span>
			<div class="flex items-center gap-3">
				<span class="text-sm text-primary">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button
						class="flex items-center gap-1.5 text-sm text-muted transition-[color,transform] duration-100 ease-out hover:text-primary active:scale-95 motion-reduce:active:scale-100"
						type="submit"
					>
						<LogOut class="size-4" />
						Sign out
					</button>
				</form>
			</div>
		</header>

		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>
</div>
