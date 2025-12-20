<script>
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Ag Tools Suite - Agriculture Management Tools</title>
	<meta name="description" content="Suite of tools for agriculture: grain calculator, asset tracker, and soil moisture monitoring" />
</svelte:head>

<section class="home">
	<div class="hero">
		<h1>Ag Tools Suite</h1>
		<p class="subtitle">Comprehensive tools for modern agriculture management</p>
	</div>

	<div class="tools-grid">
		<a href={resolve('/grain-calculator')} class="tool-card">
			<div class="tool-icon">🌾</div>
			<h2>Dry Grain Calculator</h2>
			<p>Calculate dry grain weight and moisture shrink. Enter wet weight and moisture content to determine dry weight at your target moisture level.</p>
			<div class="tool-link">Use Calculator →</div>
		</a>

		<a href={resolve('/asset-tracker')} class="tool-card">
			<div class="tool-icon">🚜</div>
			<h2>Asset Tracker</h2>
			<p>Track your equipment assets with usage hours, warranty information, serial numbers, service dates, and more.</p>
			<div class="tool-link">Track Assets →</div>
		</a>

		<a href={resolve('/soil-moisture')} class="tool-card">
			<div class="tool-icon">💧</div>
			<h2>Soil Moisture Tracker</h2>
			<p>Monitor soil moisture levels across your fields. Track readings by depth and date to make informed irrigation decisions.</p>
			<div class="tool-link">Monitor Moisture →</div>
		</a>
	</div>

	<div class="features">
		<h2>Features</h2>
		<ul>
			<li>✓ Accurate grain moisture calculations</li>
			<li>✓ Complete equipment asset management</li>
			<li>✓ Field-by-field soil moisture tracking</li>
			<li>✓ Local data storage for privacy</li>
			<li>✓ Easy-to-use interface</li>
		</ul>
	</div>
</section>

<style>
	.home {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.hero {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 3rem;
		color: var(--color-theme-2);
		margin-bottom: 0.5rem;
	}

	.subtitle {
		font-size: 1.25rem;
		color: var(--color-text);
		opacity: 0.8;
		margin: 0;
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.tool-card {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 12px;
		padding: 2rem;
		text-decoration: none;
		color: inherit;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s, box-shadow 0.2s;
		display: flex;
		flex-direction: column;
	}

	.tool-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.tool-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	.tool-card h2 {
		color: var(--color-theme-2);
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
	}

	.tool-card p {
		color: var(--color-text);
		line-height: 1.6;
		flex: 1;
		margin-bottom: 1rem;
	}

	.tool-link {
		color: var(--color-theme-1);
		font-weight: 600;
		margin-top: auto;
	}

	.tool-card:hover .tool-link {
		text-decoration: underline;
	}

	.features {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.features h2 {
		color: var(--color-theme-2);
		margin-top: 0;
		margin-bottom: 1rem;
	}

	.features ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 0.75rem;
	}

	.features li {
		color: var(--color-text);
		font-size: 1.1rem;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 2rem;
		}

		.subtitle {
			font-size: 1rem;
		}

		.tools-grid {
			grid-template-columns: 1fr;
		}

		.features ul {
			grid-template-columns: 1fr;
		}
	}
</style>
