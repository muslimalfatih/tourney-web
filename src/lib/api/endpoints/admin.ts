import { apiList, apiPost, type RequestOptions, type ApiListResult } from '$lib/api/client';

export interface Organization {
	id: string;
	name: string;
	slug: string;
	status: string;
	created_at: string;
	organizer_count: number;
	tournament_count: number;
}

export interface GlobalTournament {
	id: string;
	name: string;
	slug: string;
	status: string;
	org_id: string;
	org_name: string;
	created_at: string;
}

export interface AuditLog {
	id: string;
	actor_name: string | null;
	action: string;
	target_type: string;
	target_id: string;
	tournament_id: string | null;
	diff: Record<string, unknown> | null;
	created_at: string;
}

export function listOrganizations(opts?: RequestOptions): Promise<ApiListResult<Organization>> {
	return apiList<Organization>('/admin/organizations', opts);
}

export interface CreateOrgInput {
	org_name: string;
	slug?: string;
	organizer_email: string;
	organizer_name: string;
	password: string;
}

export function createOrganization(input: CreateOrgInput, opts?: RequestOptions) {
	return apiPost<Organization>('/admin/organizations', input, opts);
}

export function listAllTournaments(opts?: RequestOptions): Promise<ApiListResult<GlobalTournament>> {
	return apiList<GlobalTournament>('/admin/tournaments', opts);
}

export function setTournamentOversight(
	id: string,
	action: 'suspend' | 'archive' | 'restore',
	opts?: RequestOptions
) {
	return apiPost<GlobalTournament>(`/admin/tournaments/${id}/status`, { action }, opts);
}

export function listAuditLogs(opts?: RequestOptions): Promise<ApiListResult<AuditLog>> {
	return apiList<AuditLog>('/admin/audit-logs', opts);
}
