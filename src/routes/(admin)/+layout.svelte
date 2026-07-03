<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { User } from '$lib/api/types';
	import { page } from '$app/state';
	import { cn } from '$lib/utils/cn';
	import { Trophy, LayoutDashboard, Users, Calendar, LogOut } from '@lucide/svelte';

	let { data, children }: { data: { user: User }; children: Snippet } = $props();

	// Nav differs by role. Organizer routes and super-admin routes are separate
	// trees; we show the set matching the signed-in user.
	const nav = $derived(
		data.user.role === 'super_admin'
			? [
					{ label: 'Overview', href: '/super-admin', icon: LayoutDashboard },
					{ label: 'Organizers', href: '/super-admin/organizers', icon: Users },
					{ label: 'Tournaments', href: '/super-admin/tournaments', icon: Trophy }
				]
			: [
					{ label: 'Overview', href: '/organizer', icon: LayoutDashboard },
					{ label: 'Tournaments', href: '/organizer/tournaments', icon: Trophy },
					{ label: 'Schedule', href: '/organizer', icon: Calendar }
				]
	);

	function active(href: string): boolean {
		return href === '/organizer' || href === '/super-admin'
			? page.url.pathname === href
			: page.url.pathname.startsWith(href);
	}
</script>

<div class="flex min-h-screen bg-bg">
	<aside class="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
		<div class="flex items-center gap-2 px-5 py-4 font-semibold text-primary">
			<Trophy class="size-5 text-accent" />
			Laga
		</div>
		<nav class="space-y-1 px-3">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class={cn(
						'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
						active(item.href)
							? 'bg-surface-elevated text-primary'
							: 'text-secondary hover:bg-surface-elevated hover:text-primary'
					)}
				>
					<item.icon class="size-4" />
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
			<span class="text-sm text-secondary">
				{data.user.role === 'super_admin' ? 'Super Admin' : 'Organizer'}
			</span>
			<div class="flex items-center gap-3">
				<span class="text-sm text-primary">{data.user.name}</span>
				<form method="POST" action="/logout">
					<button
						class="flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
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
