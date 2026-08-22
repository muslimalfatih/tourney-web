// Phase 4B: share-URL construction and client-side QR rendering.
//
// A shared link is ALWAYS the public site URL — never the API, never Supabase,
// never internal state. `shareUrl` rebuilds the current location from a
// whitelist so debug/tracking params can never leak into a share, and orders
// the surviving params deterministically so the same view always produces the
// same string (stable for copy, QR, and og:url alike).
// Relative import (not $lib) so this module also runs under plain `node
// --test`, which doesn't know SvelteKit's alias.
import { QrCode, Ecc } from '../vendor/qrcodegen.ts';

/** The only query params a public share may carry, in canonical order. */
export const PUBLIC_SHARE_PARAMS = ['event', 'category', 'gender', 'phase'] as const;

/**
 * Canonical public URL for the current page. `siteOrigin` (production:
 * https://tourney.social) wins over the browser origin so previews and local
 * dev never leak their own hostnames into shared links; empty falls back to
 * the page's origin.
 */
export function shareUrl(pageUrl: URL, siteOrigin = ''): string {
	const origin = (siteOrigin || pageUrl.origin).replace(/\/$/, '');
	const qs = new URLSearchParams();
	for (const key of PUBLIC_SHARE_PARAMS) {
		const v = pageUrl.searchParams.get(key);
		if (v) qs.set(key, v);
	}
	const query = qs.toString();
	return `${origin}${pageUrl.pathname}${query ? `?${query}` : ''}`;
}

/** WhatsApp share intent for a URL (+ optional lead-in text). */
export function whatsappHref(url: string, text = ''): string {
	return `https://wa.me/?text=${encodeURIComponent(text ? `${text} ${url}` : url)}`;
}

/** X (Twitter) share intent. */
export function xHref(url: string, text = ''): string {
	const qs = new URLSearchParams({ url });
	if (text) qs.set('text', text);
	return `https://twitter.com/intent/tweet?${qs.toString()}`;
}

// --- QR rendering ----------------------------------------------------------
// QR codes need dark-on-light contrast to scan reliably, so modules render as
// near-black on white regardless of the app theme; the dialog frames the
// white tile deliberately.

const QUIET = 4; // standard quiet zone, in modules

/** Encode `text` and return one merged SVG path over the module grid. */
function qrPath(text: string): { d: string; size: number } {
	const qr = QrCode.encodeText(text, Ecc.MEDIUM);
	let d = '';
	for (let y = 0; y < qr.size; y++) {
		for (let x = 0; x < qr.size; x++) {
			if (qr.getModule(x, y)) d += `M${x + QUIET},${y + QUIET}h1v1h-1z`;
		}
	}
	return { d, size: qr.size + QUIET * 2 };
}

/** Standalone SVG document for `text` — used inline and for the SVG download. */
export function qrSvg(text: string): string {
	const { d, size } = qrPath(text);
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
		`shape-rendering="crispEdges" role="img" aria-label="QR code">` +
		`<rect width="${size}" height="${size}" fill="#ffffff"/>` +
		`<path d="${d}" fill="#0E1015"/></svg>`
	);
}

/** PNG data URL for `text`, rendered on a canvas (browser only). */
export function qrPngDataUrl(text: string, pixelsPerModule = 12): string {
	const qr = QrCode.encodeText(text, Ecc.MEDIUM);
	const px = (qr.size + QUIET * 2) * pixelsPerModule;
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = px;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, px, px);
	ctx.fillStyle = '#0E1015';
	for (let y = 0; y < qr.size; y++) {
		for (let x = 0; x < qr.size; x++) {
			if (qr.getModule(x, y)) {
				ctx.fillRect(
					(x + QUIET) * pixelsPerModule,
					(y + QUIET) * pixelsPerModule,
					pixelsPerModule,
					pixelsPerModule
				);
			}
		}
	}
	return canvas.toDataURL('image/png');
}
