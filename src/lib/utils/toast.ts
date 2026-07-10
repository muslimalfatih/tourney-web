// Toast-wired form enhancement. Every mutating <form use:enhance> can opt into
// consistent success/error feedback (Apple §16 feedback, §13 causality: confirm
// on the causal event) without repeating the same callback boilerplate.
import { toast } from 'svelte-sonner';
import { invalidateAll } from '$app/navigation';
import type { SubmitFunction } from '@sveltejs/kit';

type ToastEnhanceOpts = {
	// Toast title on a successful action. Omit to stay silent on success. Pass a
	// function to vary the message by submitted data (e.g. which button was used).
	success?: string | ((data: FormData) => string);
	// Fallback error title when the action didn't return a specific message.
	error?: string;
	// Re-fetch load data after success (default true — most mutations change the list).
	invalidate?: boolean;
	// Reset the form's fields on success (default false — inline edits keep their value).
	reset?: boolean;
	// Runs after a successful action (e.g. clear local state, refocus an input).
	onSuccess?: () => void | Promise<void>;
	// Fires on submit; return false to abort (e.g. client-side guard).
	before?: () => boolean | void;
	// Always runs once the action settles (success or failure) — e.g. clear a
	// `submitting` flag. Runs after success/error handling.
	settle?: () => void;
};

// Pulls a human message out of a SvelteKit action failure payload, if present.
function failMessage(data: unknown): string | undefined {
	if (data && typeof data === 'object' && 'error' in data) {
		const e = (data as { error?: unknown }).error;
		if (typeof e === 'string' && e.trim()) return e;
	}
	return undefined;
}

/**
 * Drop-in for `use:enhance` that toasts the outcome.
 *
 *   <form method="POST" action="?/addParticipant"
 *         use:enhance={toastEnhance({ success: 'Player added', error: 'Could not add player' })}>
 */
export function toastEnhance(opts: ToastEnhanceOpts = {}): SubmitFunction {
	const {
		success,
		error = 'Something went wrong',
		invalidate = true,
		reset = false,
		onSuccess,
		before,
		settle
	} = opts;
	return ({ formData }) => {
		if (before && before() === false) {
			return async ({ update }) => update({ reset });
		}
		return async ({ result, update }) => {
			// Don't let SvelteKit's default reset wipe fields unless asked.
			await update({ reset });
			if (result.type === 'success') {
				const msg = typeof success === 'function' ? success(formData) : success;
				if (msg) toast.success(msg);
				await onSuccess?.();
				if (invalidate) await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error(failMessage(result.data) ?? error);
			} else if (result.type === 'error') {
				toast.error(result.error?.message ?? error);
			}
			// 'redirect' → SvelteKit navigates; no toast needed.
			settle?.();
		};
	};
}
