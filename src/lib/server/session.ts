import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { User } from '$lib/api/types';

/**
 * Server-side session management. Tokens live ONLY in httpOnly cookies so the
 * browser's JS can never read them (XSS-safe). Load functions and form actions
 * read the access token here and forward it to tourney-api as a Bearer header;
 * authorization itself is enforced by the API.
 */

const ACCESS_COOKIE = 'tourney_at';
const REFRESH_COOKIE = 'tourney_rt';

const baseCookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev
};

export function setSession(
	cookies: Cookies,
	accessToken: string,
	refreshToken: string
): void {
	cookies.set(ACCESS_COOKIE, accessToken, { ...baseCookieOpts, maxAge: 60 * 15 });
	cookies.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}

export function getAccessToken(cookies: Cookies): string | null {
	return cookies.get(ACCESS_COOKIE) ?? null;
}

export function getRefreshToken(cookies: Cookies): string | null {
	return cookies.get(REFRESH_COOKIE) ?? null;
}

/** Minimal session view attached to locals for load functions. */
export interface Session {
	user: User | null;
	accessToken: string | null;
}
