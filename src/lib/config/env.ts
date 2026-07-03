import { env } from '$env/dynamic/public';

/**
 * Public runtime config. PUBLIC_API_BASE_URL points at laga-api's versioned
 * prefix (e.g. http://localhost:8080/api/v1). Read via $env/dynamic so it can
 * be set at deploy time without a rebuild.
 */
export const API_BASE_URL = env.PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';
