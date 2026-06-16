<script>
	import Haltestelle from './Haltestelle.svelte';
	import Skeleton from '$lib/Skeleton.svelte';

	let { data, form } = $props();

	// Skeleton nur beim ersten Laden/Navigieren; bei Aktualisierungen bleibt der Inhalt stehen.
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
	<Haltestelle data={content} {form} />
{:else if failed}
	<div class="page-sk">
		<a class="back" href="/">← Zurück zur Stadt</a>
		<p class="sk-err">Diese Haltestelle gibt es nicht (mehr).</p>
	</div>
{:else}
	<div class="page-sk">
		<div class="sk-head">
			<Skeleton w="84px" h="84px" r="50%" />
			<div class="sk-ident">
				<Skeleton w="220px" h="32px" />
				<Skeleton w="160px" h="16px" mt="10px" />
				<Skeleton w="240px" h="14px" mt="12px" />
			</div>
		</div>
		<Skeleton h="150px" r="16px" mt="8px" />
		<Skeleton h="180px" r="16px" />
		<Skeleton h="140px" r="16px" />
	</div>
{/if}

<style>
	.page-sk {
		max-width: 680px;
		margin: 0 auto;
		padding: 28px 24px 90px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sk-head {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 6px;
	}

	.sk-ident {
		flex: 1;
	}

	.back {
		display: inline-block;
		color: #79736a;
		text-decoration: none;
		font-size: 0.9rem;
	}

	.sk-err {
		color: #9c3a26;
		background: #f7e0da;
		padding: 12px 14px;
		border-radius: 10px;
	}
</style>
