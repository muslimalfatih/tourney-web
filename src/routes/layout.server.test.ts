// Regression test for Phase 1 fix S3: the root layout must never serialize
// session tokens into page data — that payload reaches client JS on every
// page, which would defeat the httpOnly cookie design in $lib/server/session.
//
// Runs on Node's built-in test runner with native type stripping (no test
// framework dependency):  npm test  →  node --test src/routes/*.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './+layout.server.ts';

const locals = {
	session: {
		user: { id: 'u1', email: 'o@example.test', name: 'Org', role: 'organizer', org_id: 'org1' },
		accessToken: 'eyJhbGciOiJIUzI1NiJ9.SECRET.SIGNATURE'
	}
};

test('root layout exposes the user identity', async () => {
	const data = await load({ locals } as never);
	assert.equal((data as { user: { email: string } }).user.email, 'o@example.test');
});

test('root layout never leaks the access token', async () => {
	const data = await load({ locals } as never);
	const serialized = JSON.stringify(data);
	assert.ok(!serialized.includes('accessToken'), 'accessToken key leaked into page data');
	assert.ok(!serialized.includes('eyJhbGciOi'), 'raw JWT leaked into page data');
});

test('root layout handles the signed-out state', async () => {
	const data = await load({ locals: { session: {} } } as never);
	assert.equal((data as { user: unknown }).user, null);
});
