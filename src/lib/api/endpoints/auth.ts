import { apiPost, apiGet, type RequestOptions } from '$lib/api/client';
import type { User } from '$lib/api/types';

export interface LoginResult {
	access_token: string;
	refresh_token: string;
	user: User;
}

export function login(email: string, password: string, opts?: RequestOptions) {
	return apiPost<LoginResult>('/auth/login', { email, password }, opts);
}

export function refresh(refresh_token: string, opts?: RequestOptions) {
	return apiPost<{ access_token: string; refresh_token: string }>(
		'/auth/refresh',
		{ refresh_token },
		opts
	);
}

export function me(opts?: RequestOptions) {
	return apiGet<User>('/me', opts);
}
