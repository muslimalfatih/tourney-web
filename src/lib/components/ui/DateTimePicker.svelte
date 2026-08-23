<script lang="ts">
	import { Popover, Calendar } from 'bits-ui';
	import { CalendarDate, Time, type DateValue, getLocalTimeZone } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Select from '$lib/components/ui/Select.svelte';

	// Burgundy date + time picker. Date is chosen from a calendar popover (click
	// the field → pick a day, no manual typing); time is a 24h dropdown in 30-min
	// steps. `value` is a bindable ISO 8601 string ('' when nothing is chosen).
	let {
		value = $bindable(''),
		minValue,
		id
	}: {
		value?: string;
		minValue?: DateValue;
		id?: string;
	} = $props();

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
	let timeStr = $state(initial.time ? fmtHM(initial.time.hour, initial.time.minute) : '');
	let calOpen = $state(false);

	function fmtHM(h: number, m: number): string {
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	// 24h times in 30-min steps for the dropdown.
	const timeOptions = Array.from({ length: 48 }, (_, i) => {
		const label = fmtHM(Math.floor(i / 2), (i % 2) * 30);
		return { value: label, label };
	});

	// Pretty label for the date trigger.
	const dateLabel = $derived(
		date
			? date.toDate(getLocalTimeZone()).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			: 'Pick a date'
	);

	// Recompose date + time into an ISO string whenever either changes. Time
	// defaults to 09:00 once a date is picked so a slot always has an hour.
	function compose() {
		if (!date) {
			value = '';
			return;
		}
		if (!timeStr) timeStr = '09:00';
		const [h, m] = timeStr.split(':').map(Number);
		const d = date.toDate(getLocalTimeZone());
		d.setHours(h, m, 0, 0);
		value = d.toISOString();
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Date: a button that opens a calendar. No manual segments. -->
	<Popover.Root bind:open={calOpen}>
		<Popover.Trigger
			{id}
			class="flex h-10 min-w-45 items-center justify-between gap-2 rounded-md border border-border bg-page px-3 text-[13px] outline-none transition-colors hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/30 data-[state=open]:border-accent"
		>
			<span class={date ? 'text-primary' : 'text-muted'}>{dateLabel}</span>
			<CalendarDays class="size-4 shrink-0 text-muted" />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content sideOffset={6} class="motion-menu z-[60]">
				<div class="rounded-lg border border-border bg-surface p-3 shadow-(--shadow-soft)">
					<Calendar.Root
						type="single"
						bind:value={date}
						{minValue}
						weekdayFormat="short"
						fixedWeeks
						onValueChange={() => {
							compose();
							calOpen = false; // close on pick — the common case
						}}
						class="w-64"
					>
						{#snippet children({ months, weekdays })}
							<Calendar.Header class="mb-2 flex items-center justify-between">
								<Calendar.PrevButton
									class="grid size-7 cursor-pointer place-items-center rounded-pill text-muted hover:bg-subtle hover:text-primary"
								>
									<ChevronLeft class="size-4" />
								</Calendar.PrevButton>
								<Calendar.Heading
									class="font-mono font-medium text-[11px] uppercase tracking-[0.16em] text-primary"
								/>
								<Calendar.NextButton
									class="grid size-7 cursor-pointer place-items-center rounded-pill text-muted hover:bg-subtle hover:text-primary"
								>
									<ChevronRight class="size-4" />
								</Calendar.NextButton>
							</Calendar.Header>
							{#each months as month (month.value)}
								<Calendar.Grid class="w-full border-collapse select-none">
									<Calendar.GridHead>
										<Calendar.GridRow class="flex">
											{#each weekdays as day (day)}
												<Calendar.HeadCell
													class="w-9 text-[10px] font-mono font-medium uppercase tracking-[0.1em] text-muted"
												>
													{day.slice(0, 2)}
												</Calendar.HeadCell>
											{/each}
										</Calendar.GridRow>
									</Calendar.GridHead>
									<Calendar.GridBody>
										{#each month.weeks as weekDates (weekDates)}
											<Calendar.GridRow class="flex w-full">
												{#each weekDates as wDate (wDate)}
													<Calendar.Cell date={wDate} month={month.value} class="p-0.5 text-center">
														<Calendar.Day
															class="grid size-8 cursor-pointer place-items-center rounded-md text-[13px] text-primary tabular-nums transition-colors hover:bg-subtle data-[disabled]:cursor-default data-[disabled]:text-muted/40 data-[outside-month]:text-muted/30 data-[selected]:bg-accent data-[selected]:text-on-accent data-[today]:font-bold data-[today]:text-accent data-[selected]:data-[today]:text-on-accent"
														/>
													</Calendar.Cell>
												{/each}
											</Calendar.GridRow>
										{/each}
									</Calendar.GridBody>
								</Calendar.Grid>
							{/each}
						{/snippet}
					</Calendar.Root>
				</div>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>

	<!-- Time: 24h dropdown, 30-min steps. -->
	<div class="w-28">
		<Select
			bind:value={timeStr}
			items={timeOptions}
			placeholder="--:--"
			onValueChange={compose}
		/>
	</div>
</div>
