// Phase 3.7 client-side duplicate-fixture classification — mirrors the
// server's decision table (internal/draw classifyDuplicate) so the builder
// can warn before submitting. The SERVER stays authoritative: this is a UX
// pre-check, and a stale client still gets the structured 409.
//
// Identity: the participant pair is UNORDERED (A vs B === B vs A) within one
// division. Cancelled fixtures were voided and byes aren't real pairings, so
// neither counts as an existing fixture.

export interface FixturePair {
	id: string;
	match_no: number;
	status: string;
	a_id: string | null;
	b_id: string | null;
}

export type PairingVerdict =
	| { kind: 'ok' }
	| { kind: 'blocked'; existing: FixturePair }
	| { kind: 'rematch'; existing: FixturePair };

const BLOCKING = new Set(['pending', 'scheduled', 'live']);
const DECIDED = new Set(['completed', 'walkover', 'retired']);

/** samePair: unordered participant-id equality, null-safe. */
export function samePair(f: FixturePair, aId: string, bId: string): boolean {
	if (!f.a_id || !f.b_id) return false;
	return (f.a_id === aId && f.b_id === bId) || (f.a_id === bId && f.b_id === aId);
}

/**
 * classifyPairing: what does creating (aId vs bId) mean given the existing
 * fixtures? 'blocked' = an unplayed fixture exists (never creatable);
 * 'rematch' = a decided fixture exists (creatable only via explicit
 * confirmation → allow_rematch); 'ok' = free (including after cancellation).
 */
export function classifyPairing(
	fixtures: FixturePair[],
	aId: string,
	bId: string
): PairingVerdict {
	let decided: FixturePair | null = null;
	for (const f of fixtures) {
		if (!samePair(f, aId, bId)) continue;
		if (BLOCKING.has(f.status)) return { kind: 'blocked', existing: f };
		if (DECIDED.has(f.status) && !decided) decided = f;
		// cancelled / bye fall through — they never count.
	}
	return decided ? { kind: 'rematch', existing: decided } : { kind: 'ok' };
}
