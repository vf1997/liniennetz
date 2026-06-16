<script>
	// Ein schimmernder Platzhalter-Block. Größe per Props anpassbar.
	let { w = '100%', h = '16px', r = '8px', mt = '0' } = $props();
</script>

<div class="sk" style="width:{w}; height:{h}; border-radius:{r}; margin-top:{mt}"></div>

<style>
	.sk {
		background: linear-gradient(90deg, #ece4d6 25%, #f5f0e7 37%, #ece4d6 63%);
		background-size: 400% 100%;
		animation: sh 1.4s ease infinite;
		flex-shrink: 0;
	}

	@keyframes sh {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: 0 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sk {
			animation: none;
		}
	}
</style>
