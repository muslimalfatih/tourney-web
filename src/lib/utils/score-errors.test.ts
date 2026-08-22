// Phase 4A: the organizer-facing rendering of structured score errors.
// Runs on Node's built-in test runner: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeScoreError } from './score-errors.ts';

test('422 invalid_score renders each violation with its set number', () => {
	const text = describeScoreError({
		code: 'invalid_score',
		message: 'invalid score',
		details: {
			violations: [
				{ set: 1, field: 'tiebreak', rule: 'set.tiebreak_required', message: 'a 7-6 set needs its tiebreak score' },
				{ rule: 'completion.decided', message: 'the match is already decided by earlier sets' }
			]
		}
	});
	assert.equal(
		text,
		'Set 1: a 7-6 set needs its tiebreak score · the match is already decided by earlier sets'
	);
});

test('409 downstream_phase_locked names the blocking matches and slots', () => {
	const text = describeScoreError({
		code: 'downstream_phase_locked',
		message: 'downstream matches have started',
		details: { locked: [{ match_no: 8, slot: 1, status: 'live' }] }
	});
	assert.ok(text.includes('Match 8'));
	assert.ok(text.includes('side 1'));
	assert.ok(text.includes('live'));
	assert.ok(text.includes('Correct or reset'));
});

test('unknown codes fall back to the server message', () => {
	assert.equal(
		describeScoreError({ code: 'completed_immutable', message: 'match already decided' }),
		'match already decided'
	);
});

test('malformed details never throw', () => {
	assert.equal(
		describeScoreError({ code: 'invalid_score', message: 'invalid score', details: 'garbage' }),
		'invalid score'
	);
	assert.equal(describeScoreError({ code: 'invalid_score', message: '', details: {} }), 'Could not save the score.');
});
