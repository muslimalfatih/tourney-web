<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { toast } from 'svelte-sonner';
	import { qrSvg, qrPngDataUrl, whatsappHref, xHref } from '$lib/utils/share';
	import { Copy, Check, Share2, Download } from '@lucide/svelte';

	// Reusable share dialog for public pages. `url` is the canonical public
	// link (built by shareUrl — whitelisted params, deterministic order); the
	// QR, the copy field, and every intent all carry exactly that string.
	let {
		open = $bindable(false),
		url,
		title = 'tourney.social'
	}: { open?: boolean; url: string; title?: string } = $props();

	const svg = $derived(qrSvg(url));
	const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

	let copied = $state(false);
	let urlInput = $state<HTMLInputElement | null>(null);

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			toast.success('Link copied');
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard unavailable (permissions, old browser, non-secure
			// context): select the text so one keystroke finishes the job.
			urlInput?.focus();
			urlInput?.select();
			toast.error('Copy blocked by the browser — the link is selected, press Ctrl/⌘ C');
		}
	}

	async function nativeShare() {
		try {
			await navigator.share({ title, url });
		} catch {
			// Dismissed or unsupported mid-flight — nothing to clean up.
		}
	}

	function download(href: string, filename: string) {
		const a = document.createElement('a');
		a.href = href;
		a.download = filename;
		a.click();
	}
	const slugName = $derived(
		(title || 'tournament').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
	);
	function downloadPng() {
		download(qrPngDataUrl(url), `${slugName}-qr.png`);
	}
	function downloadSvg() {
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const objectUrl = URL.createObjectURL(blob);
		download(objectUrl, `${slugName}-qr.svg`);
		setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
	}
</script>

<Modal bind:open title="Share" description="Anyone with the link sees the live public view.">
	<div class="flex flex-col items-center gap-5">
		<!-- QR needs dark-on-light to scan; the white tile is deliberate. -->
		<div class="w-44 rounded-lg bg-white p-3 shadow-(--shadow-soft)">
			{@html svg}
		</div>

		<div class="flex w-full items-center gap-2">
			<label for="share-url" class="sr-only">Public link</label>
			<input
				id="share-url"
				bind:this={urlInput}
				readonly
				value={url}
				onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
				class="min-w-0 flex-1 rounded-md border border-border bg-subtle px-3 py-2 text-[13px] text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
			/>
			<Button variant="subtle" onclick={copy} aria-label="Copy link">
				{#if copied}<Check class="size-4 text-accent" />{:else}<Copy class="size-4" />{/if}
				<span class="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
			</Button>
		</div>

		<div class="flex w-full flex-wrap justify-center gap-2">
			{#if canNativeShare}
				<Button variant="ghost" onclick={nativeShare}>
					<Share2 class="size-4" /> Share…
				</Button>
			{/if}
			<Button
				variant="ghost"
				onclick={() => window.open(whatsappHref(url, title), '_blank', 'noopener')}
			>
				WhatsApp
			</Button>
			<Button variant="ghost" onclick={() => window.open(xHref(url, title), '_blank', 'noopener')}>
				Post on X
			</Button>
		</div>

		<div class="flex w-full justify-center gap-2 border-t border-border pt-4">
			<Button variant="ghost" onclick={downloadPng}>
				<Download class="size-4" /> QR as PNG
			</Button>
			<Button variant="ghost" onclick={downloadSvg}>
				<Download class="size-4" /> QR as SVG
			</Button>
		</div>
	</div>
</Modal>

<style>
	/* The inline QR SVG fills its white tile. */
	div :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
