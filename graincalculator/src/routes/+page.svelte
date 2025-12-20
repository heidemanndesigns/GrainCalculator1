<script>
	import Counter from './Counter.svelte';
</script>

<svelte:head>
	<title>Grain Calculator</title>
	<meta name="description" content="Grain Calculator app" />
</svelte:head>

<section>
	<h1>Grain Calculator</h1>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>

	<Counter />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}
</style>
