// Phase 4B: metadata builder + path parsing. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMetaTags, tournamentPathInfo } from './meta.ts';

test('tournament paths parse into slug + section', () => {
	assert.deepEqual(tournamentPathInfo('/tournaments/renon-cup-2026'), {
		slug: 'renon-cup-2026',
		section: ''
	});
	assert.deepEqual(tournamentPathInfo('/tournaments/renon-cup-2026/schedule'), {
		slug: 'renon-cup-2026',
		section: 'schedule'
	});
	assert.deepEqual(tournamentPathInfo('/tournaments/renon-cup-2026/mens-doubles/bracket'), {
		slug: 'renon-cup-2026',
		section: 'bracket'
	});
	assert.deepEqual(tournamentPathInfo('/tournaments/renon-cup-2026/matches/abc'), {
		slug: 'renon-cup-2026',
		section: 'matches'
	});
	assert.equal(tournamentPathInfo('/organizer/tournaments/x'), null);
	assert.equal(tournamentPathInfo('/'), null);
});

test('meta tags carry title, canonical, og and twitter fields', () => {
	const tags = buildMetaTags({
		name: 'Renon Cup 2026',
		sport: 'tennis',
		location: 'Denpasar',
		description: null,
		section: 'bracket',
		url: 'https://tourney.social/tournaments/renon-cup-2026/mens-doubles/bracket',
		image: 'https://tourney.social/og-default.png'
	});
	assert.ok(tags.includes('<title>Renon Cup 2026 — Bracket</title>'));
	assert.ok(tags.includes('property="og:url" content="https://tourney.social/tournaments/renon-cup-2026/mens-doubles/bracket"'));
	assert.ok(tags.includes('property="og:image" content="https://tourney.social/og-default.png"'));
	assert.ok(tags.includes('name="twitter:card" content="summary_large_image"'));
	assert.ok(tags.includes('Tennis · Denpasar'));
	assert.ok(tags.includes('rel="canonical"'));
});

test('HTML in names is escaped, never injected', () => {
	const tags = buildMetaTags({
		name: '<script>alert(1)</script> & "Cup"',
		section: '',
		url: 'https://tourney.social/t/x',
		image: 'https://tourney.social/og-default.png'
	});
	assert.ok(!tags.includes('<script>'));
	assert.ok(tags.includes('&lt;script&gt;'));
	assert.ok(tags.includes('&amp; &quot;Cup&quot;'));
});
