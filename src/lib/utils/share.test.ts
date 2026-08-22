// Phase 4B: share URLs must be canonical, whitelisted, and deterministic; the
// QR encoder must produce a scannable module grid. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareUrl, whatsappHref, xHref, qrSvg, PUBLIC_SHARE_PARAMS } from './share.ts';

test('internal/debug params are stripped; public filters survive', () => {
	const url = new URL(
		'https://tourney.social/tournaments/renon-cup-2026/bracket?debug=1&category=Beginner&utm_source=x&token=secret'
	);
	assert.equal(
		shareUrl(url),
		'https://tourney.social/tournaments/renon-cup-2026/bracket?category=Beginner'
	);
});

test('parameter order is deterministic regardless of input order', () => {
	const a = new URL('https://tourney.social/t/x?phase=group&category=Open&gender=men&event=e1');
	const b = new URL('https://tourney.social/t/x?event=e1&gender=men&category=Open&phase=group');
	assert.equal(shareUrl(a), shareUrl(b));
	assert.equal(shareUrl(a), 'https://tourney.social/t/x?event=e1&category=Open&gender=men&phase=group');
	assert.deepEqual([...PUBLIC_SHARE_PARAMS], ['event', 'category', 'gender', 'phase']);
});

test('a configured site origin replaces dev/preview hostnames', () => {
	const url = new URL('http://localhost:5173/tournaments/renon-cup-2026/schedule');
	assert.equal(
		shareUrl(url, 'https://tourney.social'),
		'https://tourney.social/tournaments/renon-cup-2026/schedule'
	);
	// trailing slash on the origin never doubles
	assert.equal(
		shareUrl(url, 'https://tourney.social/'),
		'https://tourney.social/tournaments/renon-cup-2026/schedule'
	);
});

test('social intents wrap the exact URL', () => {
	const u = 'https://tourney.social/tournaments/renon-cup-2026/bracket?category=Beginner';
	assert.ok(whatsappHref(u).startsWith('https://wa.me/?text='));
	assert.ok(decodeURIComponent(whatsappHref(u, 'Renon Cup')).includes(u));
	const x = new URL(xHref(u, 'Renon Cup'));
	assert.equal(x.searchParams.get('url'), u);
	assert.equal(x.searchParams.get('text'), 'Renon Cup');
});

test('QR SVG has a white ground, dark modules, and a quiet zone', () => {
	const svg = qrSvg('https://tourney.social/tournaments/renon-cup-2026');
	assert.ok(svg.startsWith('<svg'));
	assert.ok(svg.includes('fill="#ffffff"'));
	assert.ok(svg.includes('fill="#0E1015"'));
	// Finder pattern top-left starts after the 4-module quiet zone.
	assert.ok(svg.includes('M4,4h1v1h-1z'));
	// Same input, same output — deterministic for downloads.
	assert.equal(svg, qrSvg('https://tourney.social/tournaments/renon-cup-2026'));
});
