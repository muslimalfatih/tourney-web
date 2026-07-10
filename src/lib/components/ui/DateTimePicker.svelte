<script lang="ts">
	import { DatePicker, TimeField } from 'bits-ui';
	import {
		CalendarDate,
		Time,
		type DateValue,
		getLocalTimeZone
	} from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';

	// A Burgundy date + time picker on the Bits UI DatePicker (calendar popover)
	// and TimeField (segmented HH:MM) primitives. `value` is a bindable ISO 8601
	// string ('' when nothing is chosen). The parent gets a ready-to-submit ISO
	// timestamp; internally we juggle @internationalized/date values.
	let {
		value = $bindable(''),
		minValue,
		id
	}: {
		value?: string;
		// Optional lower bound (ISO date) — e.g. don't schedule in the past.
		minValue?: DateValue;
		id?: string;
	} = $props();

	// Split the bound ISO into a calendar date + a time-of-day for the two fields.
	function parse(iso: string): { date?: DateValue; time?: Time } {
		if (!iso) return {};
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return {};
		return {
			date: new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
			time: new Time(d.getHours(), d.getMinutes())
		};
	}

	const initial = parse(value);
	let date = $state<DateValue | undefined>(initial.date);
	let time = $state<Time | undefined>(initial.time);

	// Recompose date + time into an ISO string whenever either changes. Time
	// defaults to 09:00 once a date is picked, so a slot always has an hour.
	function compose() {
		if (!date) {
			value = '';
			return;
		}
		const t = time ?? new Time(9, 0);
		if (!time) time = t;
		const zoned = date.toDate(getLocalTimeZone());
		zoned.setHours(t.hour, t.minute, 0, 0);
		value = zoned.toISOString();
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Date: segmented input + calendar popover -->
	<DatePicker.Root
		bind:value={date}
		{minValue}
		weekdayFormat="short"
		fixedWeeks
		onValueChange={compose}
	>
		<div class="relative">
			<DatePicker.Input
				{id}
				class="flex h-10 items-center gap-0.5 rounded-md border border-border bg-page pl-3 pr-9 text-[13px] text-primary focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
			>
				{#snippet children({ segments })}
					{#each segments as { part, value: seg }, i (i)}
						<DatePicker.Segment
							{part}
							class="rounded px-0.5 tabular-nums data-[segment=literal]:text-muted focus:bg-accent/15 focus:outline-none"
						>
							{seg}
						</DatePicker.Segment>
					{/each}
				{/snippet}
			</DatePicker.Input>
			<DatePicker.Trigger
				class="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-pill text-muted transition-colors hover:bg-subtle hover:text-primary"
				aria-label="Open calendar"
			>
				<CalendarDays class="size-4" />
			</DatePicker.Trigger>
		</div>

		<!-- Content doesn't portal by default; portal so the popover escapes the
		     Modal's dialog subtree (stacking + focus) when the picker is in one. -->
		<DatePicker.Portal>
			<DatePicker.Content sideOffset={6} class="motion-menu z-[60]">
				<div class="rounded-lg border border-border bg-surface p-3 shadow-(--shadow-soft)">
					<DatePicker.Calendar class="w-64">
						{#snippet children({ months, weekdays })}
							<DatePicker.Header class="mb-2 flex items-center justify-between">
								<DatePicker.PrevButton
									class="grid size-7 place-items-center rounded-pill text-muted hover:bg-subtle hover:text-primary"
								>
									<ChevronLeft class="size-4" />
								</DatePicker.PrevButton>
								<DatePicker.Heading
									class="font-display text-[13px] uppercase tracking-[0.06em] text-primary"
								/>
								<DatePicker.NextButton
									class="grid size-7 place-items-center rounded-pill text-muted hover:bg-subtle hover:text-primary"
								>
									<ChevronRight class="size-4" />
								</DatePicker.NextButton>
							</DatePicker.Header>
							{#each months as month (month.value)}
							<DatePicker.Grid class="w-full border-collapse select-none">
								<DatePicker.GridHead>
									<DatePicker.GridRow class="flex">
										{#each weekdays as day (day)}
											<DatePicker.HeadCell
												class="w-9 text-[10px] font-bold uppercase tracking-[0.1em] text-muted"
											>
												{day.slice(0, 2)}
											</DatePicker.HeadCell>
										{/each}
									</DatePicker.GridRow>
								</DatePicker.GridHead>
								<DatePicker.GridBody>
									{#each month.weeks as weekDates (weekDates)}
										<DatePicker.GridRow class="flex w-full">
											{#each weekDates as wDate (wDate)}
												<DatePicker.Cell
													date={wDate}
													month={month.value}
													class="p-0.5 text-center"
												>
													<DatePicker.Day
														class="grid size-8 place-items-center rounded-md text-[13px] text-primary tabular-nums transition-colors hover:bg-subtle data-[disabled]:text-muted/40 data-[outside-month]:text-muted/30 data-[selected]:bg-accent data-[selected]:text-on-accent data-[today]:font-bold data-[today]:text-accent data-[selected]:data-[today]:text-on-accent"
													/>
												</DatePicker.Cell>
											{/each}
										</DatePicker.GridRow>
									{/each}
								</DatePicker.GridBody>
							</DatePicker.Grid>
						{/each}
					{/snippet}
					</DatePicker.Calendar>
				</div>
			</DatePicker.Content>
		</DatePicker.Portal>
	</DatePicker.Root>

	<!-- Time: segmented HH:MM field -->
	<TimeField.Root bind:value={time} hourCycle={24} onValueChange={compose}>
		<TimeField.Input
			class="flex h-10 w-24 items-center gap-0.5 rounded-md border border-border bg-page px-3 text-[13px] text-primary focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
		>
			{#snippet children({ segments })}
				{#each segments as { part, value: seg }, i (i)}
					<TimeField.Segment
						{part}
						class="rounded px-0.5 tabular-nums data-[segment=literal]:text-muted focus:bg-accent/15 focus:outline-none"
					>
						{seg}
					</TimeField.Segment>
				{/each}
			{/snippet}
		</TimeField.Input>
	</TimeField.Root>
</div>
