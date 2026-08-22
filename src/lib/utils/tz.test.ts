// Phase 3.6: tournament-local date grouping must depend ONLY on the zone
// passed in — never the machine's own timezone. Every expectation below is an
// exact string, so these assertions hold no matter what TZ the test runner
// happens to be in (Makassar output ≠ New York output ≠ UTC output proves the
// explicit zone, not the environment, drives the result).
//
// Runs on Node's built-in test runner:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedDayKey, zonedDayLabel, zonedTime, zonedShortDate, DEFAULT_TIMEZONE } from './tz.ts';

test('UTC evening crosses midnight into the tournament-local next day (+8)', () => {
	// 17:30 UTC on 1 March = 01:30 on 2 March in Asia/Makassar (UTC+8).
	const iso = '2027-03-01T17:30:00Z';
	assert.equal(zonedDayKey(iso, 'Asia/Makassar'), '2027-03-02');
	assert.equal(zonedDayLabel(iso, 'Asia/Makassar'), 'Tuesday 2 March');
	assert.equal(zonedTime(iso, 'Asia/Makassar'), '01:30');
});

test('the same instant stays on the previous day west of UTC', () => {
	// 17:30 UTC on 1 March = 12:30 the SAME day in America/New_York (UTC-5).
	const iso = '2027-03-01T17:30:00Z';
	assert.equal(zonedDayKey(iso, 'America/New_York'), '2027-03-01');
	assert.equal(zonedTime(iso, 'America/New_York'), '12:30');
});

test('a New-Year boundary groups into the tournament-local year', () => {
	const iso = '2026-12-31T20:00:00Z'; // already 1 Jan 04:00 in Makassar
	assert.equal(zonedDayKey(iso, 'Asia/Makassar'), '2027-01-01');
	assert.equal(zonedDayKey(iso, 'UTC'), '2026-12-31');
});

test('short labels for schedule chips and bracket cards', () => {
	const iso = '2026-07-12T01:00:00Z'; // 09:00 WITA, Sunday 12 July
	assert.equal(zonedDayLabel(iso, 'Asia/Makassar', 'short'), 'Sun 12 Jul');
	assert.equal(zonedShortDate(iso, 'Asia/Makassar'), 'Jul 12');
	assert.equal(zonedTime(iso, 'Asia/Makassar'), '09:00');
});

test('bad zone falls back to the platform default, never the viewer zone', () => {
	const iso = '2027-03-01T17:30:00Z';
	assert.equal(DEFAULT_TIMEZONE, 'Asia/Makassar');
	assert.equal(zonedDayKey(iso, 'Not/AZone'), zonedDayKey(iso, DEFAULT_TIMEZONE));
	assert.equal(zonedDayKey(iso, ''), zonedDayKey(iso, DEFAULT_TIMEZONE));
});

test('invalid timestamps render empty rather than throwing', () => {
	assert.equal(zonedTime('not-a-date', 'Asia/Makassar'), '');
	assert.equal(zonedDayKey('', 'Asia/Makassar'), '');
});
