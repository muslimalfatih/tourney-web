// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from '$lib/server/session';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session;
		}
		interface PageData {
			session?: Session;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
