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
	// True only after a previously-working stream drops — drives the
	// "Reconnecting" hint without flashing it during the initial connect.
	reconnecting = $state(false);
	lastEvent = $state<LiveEvent | null>(null);
	// Bumps on every (re)connect. Consumers refetch when it changes, which
	// covers events missed while the stream was down — EventSource replays
	// nothing, so reconnect + refetch is what keeps the page from going stale.
	generation = $state(0);

	constructor(slug: string) {
		this.slug = slug;
	}

	start(): void {
		if (!browser || this.source) return;

		const url = `${API_BASE_URL}/public/tournaments/${this.slug}/stream`;
		this.source = new EventSource(url);

		this.source.addEventListener('connected', () => {
			this.connected = true;
			this.reconnecting = false;
			this.generation += 1;
		});

		// The API emits named events; onmessage doesn't fire for named SSE
		// events, so each name is registered explicitly.
		for (const name of ['match.score', 'match.status', 'schedule.updated']) {
			this.source.addEventListener(name, (e) => {
				this.lastEvent = { name, data: safeParse((e as MessageEvent).data) };
			});
		}

		this.source.onerror = () => {
			if (this.connected) this.reconnecting = true;
			this.connected = false;
			// EventSource retries automatically; the 'connected' handler above
			// bumps `generation` when it succeeds so consumers can catch up.
		};
	}

	stop(): void {
		this.source?.close();
		this.source = null;
		this.connected = false;
		this.reconnecting = false;
	}
}

function safeParse(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}
