<script>
	import Rangliste from './Rangliste.svelte';
	import Skeleton from '$lib/Skeleton.svelte';

	let { data } = $props();

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
	<Rangliste data={content} />
{:else if failed}
	<div class="page-sk">
		<p class="sk-err">Die Rangliste ließ sich gerade nicht laden. Bitte neu laden.</p>
	</div>
{:else}
	<div class="page-sk">
		<div class="sk-hero">
			<Skeleton w="120px" h="14px" />
			<Skeleton w="280px" h="38px" mt="12px" />
		</div>
		<div class="sk-podium">
			<Skeleton h="150px" r="16px" />
			<Skeleton h="190px" r="16px" />
			<Skeleton h="120px" r="16px" />
		</div>
		<Skeleton h="280px" r="16px" mt="8px" />
		<Skeleton h="180px" r="16px" />
	</div>
{/if}

<style>
	.page-sk {
		max-width: 760px;
		margin: 0 auto;
		padding: 36px 24px 90px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sk-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 12px;
	}

	.sk-podium {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		align-items: end;
		gap: 12px;
	}

	.sk-err {
		color: #9c3a26;
		background: #f7e0da;
		padding: 12px 14px;
		border-radius: 10px;
	}
</style>
