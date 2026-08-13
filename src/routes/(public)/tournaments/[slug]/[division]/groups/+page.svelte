<script lang="ts">
	// Thin wrapper — every public tournament surface renders the same component;
	// only the loader differs in which division/view it resolved from the path.
	import TournamentView from '$lib/components/public/TournamentView.svelte';
	let { data } = $props();
</script>

<TournamentView {data} />
