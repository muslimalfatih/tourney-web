<script lang="ts">
	import type { ScheduleSlot } from '$lib/api/endpoints/schedule';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { cn } from '$lib/utils/cn';
	import { Clock } from '@lucide/svelte';

	import { zonedDayKey, zonedDayLabel, zonedTime } from '$lib/utils/tz';

	// timezone is the tournament's IANA zone: every viewer sees the SAME
	// tournament-local days and times, regardless of their own timezone.
	let { slots, timezone }: { slots: ScheduleSlot[]; timezone: string } = $props();

	const dayKey = (iso: string) => zonedDayKey(iso, timezone);
	const dayLabel = (iso: string, style: 'long' | 'short') => zonedDayLabel(iso, timezone, style);
	const timeLabel = (iso: string) => zonedTime(iso, timezone);

	// Grouped once, chronologically — slots arrive pre-sorted by starts_at from
	// the API (ORDER BY s.starts_at), so insertion order into the map already
	// gives days in date order for free.
	const days = $derived.by(() => {
		const map = new Map<string, ScheduleSlot[]>();
		for (const s of slots) {
			const key = dayKey(s.starts_at);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(s);
		}
		return [...map.entries()];
	});

	// Defaults to today when the tournament is actually in progress (today is
	// one of the scheduled days) — "what's on right now" is the single most
	// useful answer to open on. Otherwise defaults to the full agenda: for a
	// tournament that's entirely upcoming or entirely past, picking one
	// arbitrary day would hide the very first thing a visitor wants to see —
	// the shape of the whole event.
	let selected = $state<string | null>(null);
	$effect(() => {
		if (selected !== null) return;
		const todayKey = dayKey(new Date().toISOString());
		selected = days.some(([k]) => k === todayKey) ? todayKey : 'all';
	});

	const visibleDays = $derived(selected === 'all' ? days : days.filter(([k]) => k === selected));
</script>

{#if slots.length === 0}
	<EmptyState title="Nothing scheduled yet" message="Match times appear here once the organizer assigns them." />
{:else}
	{#if days.length > 1}
		<!-- Date filter — a plain scrollable pill row, the same control language
		     as the division/gender pickers elsewhere on this page. "All" first:
		     seeing the whole event's shape is one tap away, never the default
		     you have to opt out of by deselecting everything. -->
		<div class="mb-6 flex flex-wrap items-center justify-center gap-2">
			<button
				type="button"
				onclick={() => (selected = 'all')}
				class={cn(
					'cursor-pointer rounded-pill border px-4 py-1.5 text-[11px] font-mono font-medium uppercase tracking-widest transition-colors duration-100',
					selected === 'all'
						? 'border-border bg-subtle text-primary'
						: 'border-border bg-page text-muted hover:border-accent hover:text-primary'
				)}
			>
				All days
			</button>
			{#each days as [key, daySlots] (key)}
				<button
					type="button"
					onclick={() => (selected = key)}
					class={cn(
						'cursor-pointer rounded-pill border px-4 py-1.5 text-[11px] font-mono font-medium uppercase tracking-widest transition-colors duration-100',
						selected === key
							? 'border-border bg-subtle text-primary'
							: 'border-border bg-page text-muted hover:border-accent hover:text-primary'
					)}
				>
					{dayLabel(daySlots[0].starts_at, 'short')}
				</button>
			{/each}
		</div>
	{/if}

	<div class="vt-content flex flex-col gap-6">
		{#each visibleDays as [key, daySlots] (key)}
			<div>
				<!-- Day header only earns its keep with >1 day visible — on a
				     single selected day (or a one-day tournament) it would just
				     repeat the pill above it. -->
				{#if days.length > 1 && selected === 'all'}
					<h3 class="mb-2 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.16em] text-accent">
						<Clock class="size-3.5" />
						{dayLabel(daySlots[0].starts_at, 'long')}
						<span class="font-normal normal-case tracking-normal text-muted"
							>· {daySlots.length} match{daySlots.length === 1 ? '' : 'es'}</span
						>
					</h3>
				{/if}
				<Card padded={false}>
					<ul class="divide-y divide-border">
						{#each daySlots as s (s.id)}
							<li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
								<span class="w-14 shrink-0 font-mono text-[15px] tabular-nums text-primary">
									{timeLabel(s.starts_at)}
								</span>
								<span class="w-24 shrink-0 text-[11px] font-mono font-medium uppercase tracking-[0.08em] text-muted">
									{s.court_name}
								</span>

								<div class="min-w-0 flex-1 basis-40">
									{#if s.event_name}
										<span
											class="mb-1 inline-block rounded-pill border border-border bg-subtle px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.08em] text-muted"
										>
											{s.event_name}
										</span>
									{/if}
									<p class="truncate text-[13px] text-primary">
										{s.match_label ?? 'TBD'}
									</p>
								</div>

								{#if s.match_status === 'live'}
									<span
										class="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-danger/10 px-2.5 py-1 text-[11px] font-mono font-medium uppercase tracking-[0.08em] text-danger"
									>
										<span class="size-1.5 animate-pulse rounded-full bg-danger motion-reduce:animate-none"
										></span>
										Live
									</span>
								{:else if s.match_status === 'completed'}
									<span class="shrink-0 text-[11px] font-mono font-medium uppercase tracking-[0.08em] text-muted">
										Final
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				</Card>
			</div>
		{/each}
	</div>
{/if}
