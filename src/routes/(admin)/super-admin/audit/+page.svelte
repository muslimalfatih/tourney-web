<script lang="ts">
	import type { AuditLog } from '$lib/api/endpoints/admin';
	import Card from '$lib/components/ui/Card.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data }: { data: { logs: AuditLog[] } } = $props();

	// Map action prefixes to a readable label + tone.
	function label(action: string): string {
		return action
			.replace(/[._]/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}
	function tone(action: string): 'published' | 'archived' | 'gold' | 'draft' {
		if (action.includes('publish')) return 'published';
		if (action.includes('suspend') || action.includes('archive')) return 'archived';
		if (action.includes('create')) return 'gold';
		return 'draft';
	}
	function when(iso: string): string {
		return new Date(iso).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	function diffStr(diff: Record<string, unknown> | null): string {
		if (!diff) return '';
		return Object.entries(diff)
			.map(([k, v]) => `${k}: ${v}`)
			.join(' · ');
	}
</script>

<div class="mb-6">
	<h1 class="font-display text-3xl tracking-[-0.01em] text-primary">Audit log</h1>
	<p class="text-xs text-muted">Critical changes across the platform, newest first.</p>
</div>

{#if data.logs.length === 0}
	<EmptyState
		title="No activity yet"
		message="Publishing, suspensions, and organization changes are recorded here."
	/>
{:else}
	<Card padded={false}>
		<ul class="divide-y divide-border">
			{#each data.logs as log (log.id)}
				<li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
					<Tag tone={tone(log.action)} class="shrink-0">{label(log.action)}</Tag>
					<span class="text-[13px] text-primary">{log.actor_name ?? 'System'}</span>
					{#if diffStr(log.diff)}
						<span class="text-[12px] text-muted">· {diffStr(log.diff)}</span>
					{/if}
					<span class="ml-auto shrink-0 text-[11px] tabular-nums text-muted">{when(log.created_at)}</span>
				</li>
			{/each}
		</ul>
	</Card>
{/if}
