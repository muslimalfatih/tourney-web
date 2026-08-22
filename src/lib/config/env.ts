import { env } from '$env/dynamic/public';

/**
 * Public runtime config. PUBLIC_API_BASE_URL points at laga-api's versioned
 * prefix (e.g. http://localhost:8080/api/v1). Read via $env/dynamic so it can
 * be set at deploy time without a rebuild.
 */
export const API_BASE_URL = env.PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

/**
 * Canonical public site origin for shared links and og:url. In production set
 * PUBLIC_SITE_URL=https://tourney.social so previews/dev never leak their own
 * hostnames into shares; empty falls back to the current browser origin.
 */
export const SITE_BASE_URL = env.PUBLIC_SITE_URL ?? '';
