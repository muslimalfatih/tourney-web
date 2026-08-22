// Phase 3.7: the builder's pre-submit duplicate check must mirror the
// server's decision table. Runs on Node's built-in test runner: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPairing, samePair, type FixturePair } from './fixtures.ts';

const fx = (no: number, status: string, a: string | null, b: string | null): FixturePair => ({
	id: `m${no}`,
	match_no: no,
	status,
	a_id: a,
	b_id: b
});

test('reverse pair order counts as the same pairing', () => {
	const f = fx(1, 'pending', 'A', 'B');
	assert.ok(samePair(f, 'A', 'B'));
	assert.ok(samePair(f, 'B', 'A'));
	assert.ok(!samePair(f, 'A', 'C'));
});

test('an unplayed fixture blocks the pairing', () => {
	for (const status of ['pending', 'scheduled', 'live']) {
		const v = classifyPairing([fx(3, status, 'A', 'B')], 'B', 'A');
		assert.equal(v.kind, 'blocked');
		if (v.kind === 'blocked') assert.equal(v.existing.match_no, 3);
	}
});

test('a decided fixture asks for rematch confirmation', () => {
	for (const status of ['completed', 'walkover', 'retired']) {
		assert.equal(classifyPairing([fx(1, status, 'A', 'B')], 'A', 'B').kind, 'rematch');
	}
});

test('cancelled and bye fixtures never count', () => {
	const fixtures = [fx(1, 'cancelled', 'A', 'B'), fx(2, 'bye', 'A', null)];
	assert.equal(classifyPairing(fixtures, 'A', 'B').kind, 'ok');
});

test('an unplayed fixture wins over an earlier decided one', () => {
	const fixtures = [fx(1, 'completed', 'A', 'B'), fx(2, 'pending', 'B', 'A')];
	const v = classifyPairing(fixtures, 'A', 'B');
	assert.equal(v.kind, 'blocked');
	if (v.kind === 'blocked') assert.equal(v.existing.match_no, 2);
});

test('other pairings do not interfere', () => {
	const fixtures = [fx(1, 'pending', 'A', 'C'), fx(2, 'live', 'C', 'B')];
	assert.equal(classifyPairing(fixtures, 'A', 'B').kind, 'ok');
});
