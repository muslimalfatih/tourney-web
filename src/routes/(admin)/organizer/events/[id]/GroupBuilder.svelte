<script lang="ts">
	import type { Participant } from '$lib/api/endpoints/participants';
	import type { GroupKnockout } from '$lib/api/endpoints/events';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toastEnhance } from '$lib/utils/toast';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { inputClass } from '$lib/utils/ui';
	import { Plus, Trash2, ArrowRight } from '@lucide/svelte';

	// Manual group assignment + deterministic build. The organizer creates groups
	// (name + advance count), assigns each team to exactly one group, then builds:
	// round-robin per group + a knockout skeleton wired from the advancers.
	let {
		participants,
		hasDraw,
		entryNoun,
		groupKnockout = null
	}: {
		participants: Participant[];
		hasDraw: boolean;
		entryNoun: string;
		// Existing draw, if any — used to prefill groups + assignments on edit.
		groupKnockout?: GroupKnockout | null;
	} = $props();

	type Group = { name: string; advance: number };

	// Seed from the existing draw when there is one; otherwise start with two
	// groups (top 1 advancing each) — the smallest valid setup. participants is a
	// stable superset of everyone assigned, so ids from standings always resolve.
	function seedGroups(): Group[] {
		const src = groupKnockout?.groups;
		if (src && src.length > 0)
			return src.map((g) => ({ name: g.name, advance: g.advance_count }));
		return [
			{ name: 'Group A', advance: 1 },
			{ name: 'Group B', advance: 1 }
		];
	}
	function seedAssignment(): Record<string, number> {
		const src = groupKnockout?.groups;
		if (!src) return {};
		const out: Record<string, number> = {};
		src.forEach((g, i) => {
			for (const s of g.standings) out[s.participant_id] = i;
		});
		return out;
	}

	let groups = $state<Group[]>(seedGroups());
	// team id -> group index (or -1 = unassigned).
	let assignment = $state<Record<string, number>>(seedAssignment());

	// Re-seed when fresh server data arrives (after a rebuild → invalidateAll).
	// Keyed on a snapshot of the incoming draw so it fires only when that data
	// actually changes — untrack keeps in-progress edits from retriggering it.
	const drawKey = $derived(
		JSON.stringify(
			groupKnockout?.groups?.map((g) => ({
				n: g.name,
				a: g.advance_count,
				t: g.standings.map((s) => s.participant_id)
			})) ?? null
		)
	);
	let seededKey = untrack(() => drawKey);
	$effect(() => {
		if (drawKey !== seededKey) {
			groups = seedGroups();
			assignment = seedAssignment();
			seededKey = drawKey;
		}
	});

	const nextName = () => `Group ${String.fromCharCode(65 + groups.length)}`;
	function addGroup() {
		groups = [...groups, { name: nextName(), advance: 1 }];
	}
	function removeGroup(i: number) {
		// Drop the group; unassign its teams and shift higher indexes down.
		const next: Record<string, number> = {};
		for (const [id, g] of Object.entries(assignment)) {
			if (g === i) continue;
			next[id] = g > i ? g - 1 : g;
		}
		assignment = next;
		groups = groups.filter((_, idx) => idx !== i);
	}

	function groupItems() {
		return [
			{ value: '-1', label: 'Unassigned' },
			...groups.map((g, i) => ({ value: String(i), label: g.name }))
		];
	}
	function assignedIds(i: number) {
		return participants.filter((p) => assignment[p.id] === i);
	}
	const unassignedCount = $derived(
		participants.filter((p) => (assignment[p.id] ?? -1) < 0).length
	);

	// --- Validation (mirrors the backend rules) --------------------------------
	const issues = $derived.by(() => {
		const errs: string[] = [];
		groups.forEach((g, i) => {
			const size = assignedIds(i).length;
			if (!g.name.trim()) errs.push(`Group ${i + 1} needs a name.`);
			if (size < 2) errs.push(`${g.name || `Group ${i + 1}`} needs at least 2 ${entryNoun}s.`);
			if (g.advance < 1 || g.advance > size)
				errs.push(`${g.name || `Group ${i + 1}`}: advance must be 1–${size}.`);
		});
		const totalAdvance = groups.reduce((s, g) => s + g.advance, 0);
		if (totalAdvance < 2) errs.push('At least 2 teams must advance in total.');
		return errs;
	});
	const canBuild = $derived(issues.length === 0);

	const payload = $derived(
		JSON.stringify(
			groups.map((g, i) => ({
				name: g.name.trim(),
				advance_count: g.advance,
				team_ids: assignedIds(i).map((p) => p.id)
			}))
		)
	);

	let building = $state(false);
	let confirmOpen = $state(false);
	let buildForm = $state<HTMLFormElement>();
	function onBuildClick() {
		if (hasDraw) confirmOpen = true;
		else buildForm?.requestSubmit();
	}
</script>

<div class="flex flex-col gap-5">
	{#if participants.length < 4}
		<Card>
			<p class="text-sm text-muted">
				Group → knockout needs at least 4 {entryNoun}s (two groups of two). Add more in the
				Participants tab.
			</p>
		</Card>
	{:else}
		<!-- Groups: name + advance count -->
		<Card>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<h3 class="font-mono font-medium text-[11px] uppercase tracking-[0.16em] text-primary">Groups</h3>
					<p class="text-xs text-muted">Name each group and set how many teams advance.</p>
				</div>
				<Button variant="subtle" size="sm" onclick={addGroup}>
					<Plus class="size-3.5" /> Add group
				</Button>
			</div>
			<div class="flex flex-col gap-2">
				{#each groups as g, i (i)}
					<div class="flex items-center gap-2">
						<input
							bind:value={g.name}
							placeholder="Group name"
							class="{inputClass} h-9 flex-1 text-[13px]"
						/>
						<label class="flex items-center gap-1.5 text-[11px] text-muted">
							Advance
							<input
								type="number"
								min="1"
								max={Math.max(1, assignedIds(i).length)}
								bind:value={g.advance}
								class="{inputClass} h-9 w-16 text-[13px]"
							/>
						</label>
						<span class="w-20 shrink-0 text-right text-[11px] text-muted">
							{assignedIds(i).length} {entryNoun}{assignedIds(i).length === 1 ? '' : 's'}
						</span>
						{#if groups.length > 2}
							<button
								type="button"
								onclick={() => removeGroup(i)}
								aria-label="Remove group"
								class="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
							>
								<Trash2 class="size-4" />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</Card>

		<!-- Assign teams to groups -->
		<Card padded={false}>
			<div class="flex items-center justify-between border-b border-border px-5 py-4">
				<h3 class="font-mono font-medium text-[11px] uppercase tracking-[0.16em] text-primary">
					Assign {entryNoun}s
				</h3>
				<span class="text-xs text-muted">
					{unassignedCount} unassigned
				</span>
			</div>
			<ul class="divide-y divide-border">
				{#each participants as p (p.id)}
					<li class="flex items-center gap-3 px-5 py-2.5">
						<span class="min-w-0 flex-1 truncate text-[13px] text-primary">{p.display_name}</span>
						<div class="w-44 shrink-0">
							<Select
								value={String(assignment[p.id] ?? -1)}
								items={groupItems()}
								onValueChange={(v) => (assignment = { ...assignment, [p.id]: Number(v) })}
							/>
						</div>
					</li>
				{/each}
			</ul>
		</Card>

		<!-- Validation -->
		{#if issues.length > 0}
			<div class="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-primary">
				<ul class="list-inside list-disc space-y-0.5">
					{#each issues as msg (msg)}
						<li>{msg}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Build -->
		<div class="flex items-center justify-end gap-3 border-t border-border pt-4">
			{#if !confirmOpen}
				<Button onclick={onBuildClick} disabled={!canBuild || building}>
					<ArrowRight class="size-4" />
					{hasDraw ? 'Rebuild draw' : 'Build draw'}
				</Button>
			{:else}
				<span class="text-[13px] text-muted">Replace the current draw?</span>
				<Button variant="ghost" onclick={() => (confirmOpen = false)}>Cancel</Button>
				<Button onclick={() => buildForm?.requestSubmit()} disabled={building}>
					{building ? 'Building…' : 'Yes, replace'}
				</Button>
			{/if}
		</div>

		<form
			bind:this={buildForm}
			method="POST"
			action="?/setGroups"
			class="hidden"
			use:enhance={toastEnhance({
				success: 'Group draw built',
				error: 'Could not build the group draw.',
				before: () => (building = true),
				settle: () => {
					building = false;
					confirmOpen = false;
				}
			})}
		>
			<input type="hidden" name="groups" value={payload} />
		</form>
	{/if}
</div>
