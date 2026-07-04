<script lang="ts">
	import type { ScheduleSlot } from '$lib/api/endpoints/schedule';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';

	let { data }: { data: { schedule: ScheduleSlot[] } } = $props();

	// Group slots by date for a readable day-by-day schedule.
	const days = $derived.by(() => {
		const map = new Map<string, ScheduleSlot[]>();
		for (const s of data.schedule) {
			const day = new Date(s.starts_at).toLocaleDateString('en-GB', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				timeZone: 'UTC'
			});
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(s);
		}
		return [...map.entries()];
	});

	function time(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	}
</script>

<h2 class="mb-4 font-display text-lg uppercase tracking-[0.06em] text-primary">Schedule</h2>

{#if data.schedule.length === 0}
	<EmptyState
		title="Schedule not published yet"
		message="Court assignments and match times will appear here once the organizer publishes them."
	/>
{:else}
	<div class="space-y-6">
		{#each days as [day, slots] (day)}
			<div>
				<h3 class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{day}</h3>
				<Card padded={false}>
					<ul class="divide-y divide-border">
						{#each slots as s (s.id)}
							<li class="flex items-center gap-4 px-5 py-3">
								<span class="w-14 shrink-0 font-display text-[14px] tabular-nums text-primary">{time(s.starts_at)}</span>
								<span class="w-28 shrink-0 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{s.court_name}</span>
								<span class="text-[13px] text-primary">{s.match_label ?? 'TBD'}</span>
							</li>
						{/each}
					</ul>
				</Card>
			</div>
		{/each}
	</div>
{/if}
