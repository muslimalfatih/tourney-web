import { API_BASE_URL } from '$lib/config/env';

/**
 * API client for tourney-api.
 *
 * Contract conventions (mirrors the backend):
 *   success: { data: T }         → unwrapped to T
 *   list:    { data: T[], meta } → returned as { data, meta }
 *   error:   { error: { code, message, details? } } → thrown as ApiError
 *
 * The client is isomorphic. On the server (load functions), pass SvelteKit's
 * `fetch` and the caller's access token so requests are authenticated; the
 * token comes from the httpOnly cookie via hooks.server.ts, never from the
 * browser.
 */

export interface ApiMeta {
	page: number;
	per_page: number;
	total: number;
}

export interface ApiListResult<T> {
	data: T[];
	meta: ApiMeta;
}

export class ApiError extends Error {
	code: string;
	status: number;
	details: unknown;

	constructor(status: number, code: string, message: string, details?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export interface RequestOptions {
	/** SvelteKit's fetch on the server; window.fetch in the browser. */
	fetch?: typeof fetch;
	/** Bearer access token to forward (server-side only). */
	token?: string | null;
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	body?: unknown;
	/** Query params; undefined/null values are skipped. */
	query?: Record<string, string | number | boolean | undefined | null>;
	signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
	const url = new URL(API_BASE_URL + path);
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
		}
	}
	return url.toString();
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const f = opts.fetch ?? fetch;
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
	if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

	const res = await f(buildUrl(path, opts.query), {
		method: opts.method ?? 'GET',
		headers,
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		signal: opts.signal
	});

	if (res.status === 204) return undefined as T;

	const payload = await res.json().catch(() => null);

	if (!res.ok) {
		const err = payload?.error ?? {};
		throw new ApiError(
			res.status,
			err.code ?? 'unknown_error',
			err.message ?? `Request failed with status ${res.status}`,
			err.details
		);
	}

	return payload?.data as T;
}

/** GET a single resource, unwrapping { data }. */
export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
	return request<T>(path, { ...opts, method: 'GET' });
}

/** GET a paginated list, returning { data, meta }. */
export async function apiList<T>(path: string, opts?: RequestOptions): Promise<ApiListResult<T>> {
	const f = opts?.fetch ?? fetch;
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;

	const res = await f(buildUrl(path, opts?.query), { headers, signal: opts?.signal });
	const payload = await res.json().catch(() => null);
	if (!res.ok) {
		const err = payload?.error ?? {};
		throw new ApiError(res.status, err.code ?? 'unknown_error', err.message ?? 'Request failed');
	}
	return { data: payload?.data ?? [], meta: payload?.meta ?? { page: 1, per_page: 20, total: 0 } };
}

export function apiPost<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
	return request<T>(path, { ...opts, method: 'POST', body });
}

export function apiPatch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
	return request<T>(path, { ...opts, method: 'PATCH', body });
}

export function apiPut<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
	return request<T>(path, { ...opts, method: 'PUT', body });
}

export function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
	return request<T>(path, { ...opts, method: 'DELETE' });
}
