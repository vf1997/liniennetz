<script>
	import Stadt from './Stadt.svelte';
	import Skeleton from '$lib/Skeleton.svelte';

	let { data, form } = $props();

	// Skeleton nur, solange noch KEIN Inhalt da ist (erstes Laden / Navigation).
	// Bei Aktualisierungen (z. B. nach einem Fahrschein) bleibt der bisherige
	// Inhalt stehen und wird im Hintergrund ersetzt – kein Skeleton-Flackern.
	let content = $state(null);
	let failed = $state(false);
	$effect(() => {
		let cancelled = false;
		failed = false;
		Promise.resolve(data.content)
			.then((c) => {
				if (!cancelled) content = c;
			})
			.catch(() => {
				if (!cancelled) failed = true;
			});
		return () => (cancelled = true);
	});
</script>

{#if content}
	<Stadt data={content} {form} />
{:else if failed}
	<div class="page-sk">
		<p class="sk-err">Die Stadt ließ sich gerade nicht laden. Lade die Seite bitte neu.</p>
	</div>
{:else}
	<div class="page-sk">
		<Skeleton h="62px" r="14px" />
		<div class="sk-stats">
			<Skeleton h="112px" r="14px" />
			<Skeleton h="112px" r="14px" />
			<Skeleton h="112px" r="14px" />
		</div>
		<Skeleton h="360px" r="16px" mt="8px" />
		<div class="sk-grid">
			<Skeleton h="260px" r="16px" />
			<Skeleton h="260px" r="16px" />
		</div>
	</div>
{/if}

<style>
	.page-sk {
		max-width: 900px;
		margin: 0 auto;
		padding: 32px 24px 90px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.sk-stats {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr;
		gap: 14px;
	}

	.sk-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 22px;
		margin-top: 8px;
	}

	.sk-err {
		color: #9c3a26;
		background: #f7e0da;
		padding: 12px 14px;
		border-radius: 10px;
	}

	@media (max-width: 720px) {
		.sk-stats,
		.sk-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
