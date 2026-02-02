<script>
	import { authStore } from '$lib/stores/authStore.js';
	import { calculationStore } from '$lib/stores/calculationStore.svelte.js';
	import { fieldStore } from '$lib/stores/fieldStore.svelte.js';
	import CalculationHistory from '$lib/components/CalculationHistory.svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	const { params } = $props();

	let authState = $state(get(authStore));
	onMount(() => {
		const unsub = authStore.subscribe((s) => {
			authState = s;
			if (browser && !s.loading && !s.user) {
				goto(resolve('/login'));
			}
		});
		return () => unsub();
	});

	let user = $derived(authState.user);
	let loadingAuth = $derived(authState.loading);

	let farmId = $derived(params?.id);
	let fieldId = $derived(params?.fieldId);

	let field = $state(null);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (user && !loadingAuth && farmId && fieldId) {
			loadField();
		}
	});

	async function loadField() {
		if (!farmId || !fieldId) return;
		loading = true;
		error = '';
		try {
			field = await fieldStore.getById(fieldId, farmId);
			// If fieldStore.getById signature is (userId, farmId, id) in service, the store adapts it; else fallback:
			if (!field) {
				// attempt via service fallback
				try {
					const { FieldService } = await import('$lib/services/fieldService.js');
					field = await FieldService.getById(user?.uid, farmId, fieldId);
				} catch {
					// ignore
				}
			}
			if (!field) {
				error = 'Field not found or you do not have access.';
			}
		} catch (e) {
			error = e?.message || 'Failed to load field';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Field Details</title>
	<meta name="description" content="View field and its calculation history" />
</svelte:head>

{#if loadingAuth || loading}
	<div class="loading-container">
		<div class="loading">Loading field...</div>
	</div>
{:else if error}
	<div class="error-message">{error}</div>
{:else}
	<section class="field-detail">
		<header class="hero">
			<div class="hero-top">
				<a class="back-link" href={resolve(`/farms/${farmId}`)} aria-label="Back to farm"
					>← Back to farm</a
				>
			</div>
			<h1>Field: {field?.name || 'Untitled'}</h1>
			<div class="stats">
				{#if field?.acres}
					<span class="chip">{field.acres} acres</span>
				{/if}
				{#if fieldId}
					<span class="chip muted">ID: {fieldId.slice(0, 8)}...</span>
				{/if}
			</div>
		</header>

		{#if user && farmId && fieldId}
			<CalculationHistory {farmId} {fieldId} />
		{/if}
	</section>
{/if}

<style>
	:global(main) {
		max-width: min(96vw, 1400px);
		padding-left: 1rem;
		padding-right: 1rem;
	}
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 50vh;
		padding: 2rem;
	}
	.loading {
		color: var(--color-text);
	}
	.field-detail {
		width: 100%;
		margin: 0 auto;
		padding: 0;
	}
	.hero {
		position: relative;
		background:
			radial-gradient(1200px 400px at 10% -20%, rgba(255, 0, 184, 0.25), transparent),
			radial-gradient(900px 300px at 110% 0%, rgba(0, 255, 255, 0.22), transparent),
			linear-gradient(135deg, rgba(20, 26, 46, 0.85), rgba(22, 10, 34, 0.85));
		border: 1px solid rgba(255, 0, 184, 0.2);
		border-radius: 18px;
		padding: 1.5rem 1.75rem;
		margin: 0 0 1.25rem 0;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.6),
			0 0 0 1px rgba(0, 255, 255, 0.08),
			0 0 24px rgba(255, 0, 184, 0.18);
	}
	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}
	.hero h1 {
		margin: 0.25rem 0 0.5rem 0;
		color: #e2e8f0;
		font-size: clamp(1.25rem, 1.1rem + 1.2vw, 1.75rem);
		font-weight: 800;
		letter-spacing: -0.01em;
		text-shadow: 0 0 12px rgba(0, 255, 255, 0.35);
	}
	.stats {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.chip {
		background: rgba(0, 255, 255, 0.1);
		color: #7ee7ff;
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 700;
		border: 1px solid rgba(0, 255, 255, 0.35);
		box-shadow: 0 0 16px rgba(0, 255, 255, 0.18) inset;
	}
	.chip.muted {
		background: rgba(255, 0, 184, 0.1);
		color: #ff9bd7;
		border-color: rgba(255, 0, 184, 0.4);
		box-shadow: 0 0 16px rgba(255, 0, 184, 0.18) inset;
	}
	.back-link {
		text-decoration: none;
		color: #7ee7ff;
		font-weight: 700;
		font-size: 0.9rem;
		text-shadow: 0 0 10px rgba(0, 255, 255, 0.35);
	}
	.error-message {
		background: #fee;
		color: #c33;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #fcc;
		margin: 1rem;
	}
	/* Container polish without targeting child component internals */
	.field-detail :global(.calculation-history) {
		background: rgba(8, 10, 24, 0.65);
		border: 1px solid rgba(255, 0, 184, 0.18);
		border-radius: 14px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(0, 255, 255, 0.06);
	}
	.field-detail :global(.history-header h3) {
		color: #e2e8f0;
		text-shadow: 0 0 10px rgba(255, 0, 184, 0.25);
	}
	@media (min-width: 1024px) {
		.hero {
			padding: 1.5rem 2rem;
			margin-bottom: 1.25rem;
		}
	}
	@media (max-width: 640px) {
		.field-detail {
			padding: 0.75rem;
		}
		.hero {
			padding: 1rem 1rem;
		}
	}
</style>
