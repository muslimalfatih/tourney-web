import { API_BASE_URL } from '$lib/config/env';
import { browser } from '$app/environment';

/**
 * Live update subscriber over SSE. Public pages create one of these for a
 * tournament slug; it opens an EventSource against laga-api's public stream and
 * exposes the latest event reactively. EventSource auto-reconnects, so there is
 * no manual retry logic.
 *
 * Usage in a component:
 *   const live = new LiveConnection(slug);
 *   $effect(() => { live.start(); return () => live.stop(); });
 *   // read live.lastEvent
 */
export interface LiveEvent {
	name: string;
	data: unknown;
}

export class LiveConnection {
	private source: EventSource | null = null;
	private slug: string;

	connected = $state(false);
	lastEvent = $state<LiveEvent | null>(null);

	constructor(slug: string) {
		this.slug = slug;
	}

	start(): void {
		if (!browser || this.source) return;

		const url = `${API_BASE_URL}/public/tournaments/${this.slug}/stream`;
		this.source = new EventSource(url);

		this.source.addEventListener('connected', () => {
			this.connected = true;
		});

		// The API emits named events (match.score, match.status). Listen broadly
		// via onmessage plus the known named events.
		for (const name of ['match.score', 'match.status']) {
			this.source.addEventListener(name, (e) => {
				this.lastEvent = { name, data: safeParse((e as MessageEvent).data) };
			});
		}

		this.source.onerror = () => {
			this.connected = false;
			// EventSource retries automatically; nothing to do here.
		};
	}

	stop(): void {
		this.source?.close();
		this.source = null;
		this.connected = false;
	}
}

function safeParse(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}
