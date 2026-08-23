import tailwindcss from '@tailwindcss/vite';
import vercel from '@sveltejs/adapter-vercel';
import node from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// On Vercel (VERCEL=1 in their build env) build serverless functions;
			// everywhere else keep the Node server so `pnpm build && node build`
			// self-hosting and local previews still work. tourney-api deploys
			// separately either way. See README.
			adapter: process.env.VERCEL ? vercel({ runtime: 'nodejs24.x' }) : node(),

			alias: {
				$lib: 'src/lib'
			}
		})
	]
});
