import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getEvent, generateDraw } from '$lib/api/endpoints/events';
import {
	listParticipants,
	addParticipant,
	setSeed,
	deleteParticipant
} from '$lib/api/endpoints/participants';
import { ApiError } from '$lib/api/client';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const token = locals.session.accessToken;
	try {
		const [event, participants] = await Promise.all([
			getEvent(params.id, { fetch, token }),
			listParticipants(params.id, { fetch, token })
		]);
		return { event, participants };
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) throw error(404, 'Event not found');
		throw error(502, 'Failed to load event');
	}
};

export const actions: Actions = {
	addParticipant: async ({ params, request, locals, fetch }) => {
		const form = await request.formData();
		const display_name = String(form.get('display_name') ?? '').trim();
		const seedRaw = String(form.get('seed') ?? '').trim();
		const seed = seedRaw ? Number(seedRaw) : null;
		if (!display_name) return fail(400, { error: 'A name is required.' });
		if (seedRaw && (!Number.isInteger(seed) || (seed ?? 0) < 1)) {
			return fail(400, { error: 'Seed must be a positive whole number.' });
		}
		try {
			await addParticipant(params.id, { display_name, seed }, { fetch, token: locals.session.accessToken });
			return { added: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not add.' });
		}
	},

	setSeed: async ({ request, locals, fetch }) => {
		const form = await request.formData();
		const id = String(form.get('participantId') ?? '');
		const seedRaw = String(form.get('seed') ?? '').trim();
		const seed = seedRaw ? Number(seedRaw) : null;
		try {
			await setSeed(id, seed, { fetch, token: locals.session.accessToken });
			return { seeded: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Could not set seed.' });
		}
	},

	deleteParticipant: async ({ request, locals, fetch }) => {
		const id = String((await request.formData()).get('participantId') ?? '');
		try {
			await deleteParticipant(id, { fetch, token: locals.session.accessToken });
			return { deleted: true };
		} catch (e) {
			return fail(500, { error: e instanceof ApiError ? e.message : 'Delete failed.' });
		}
	},

	generate: async ({ params, locals, fetch }) => {
		try {
			await generateDraw(params.id, { fetch, token: locals.session.accessToken });
			return { generated: true };
		} catch (e) {
			return fail(
				e instanceof ApiError ? e.status : 500,
				{ error: e instanceof ApiError ? e.message : 'Could not generate the draw.' }
			);
		}
	}
};
