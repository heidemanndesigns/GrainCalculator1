<script>
	import { calculationStore } from '$lib/stores/calculationStore.svelte.js';

	let { farmId, fieldId, refreshKey = 0 } = $props();

	let calculations = $state([]);
	let loading = $state(false);
	let error = $state('');

	// Load calculations when farmId or fieldId changes
	$effect(() => {
		// include refreshKey in dependencies so external changes can trigger reload
		const _ = refreshKey;
		if (farmId && fieldId) {
			loadCalculations();
		} else {
			calculations = [];
		}
	});

	async function loadCalculations() {
		if (!farmId || !fieldId) return;
		loading = true;
		error = '';
		try {
			calculations = await calculationStore.getAll(farmId, fieldId);
		} catch (err) {
			console.error('Error loading calculations:', err);
			error = 'Failed to load calculations';
		} finally {
			loading = false;
		}
	}

	async function deleteCalculation(id) {
		if (!confirm('Are you sure you want to delete this calculation?')) {
			return;
		}

		loading = true;
		error = '';
		try {
			await calculationStore.remove(farmId, fieldId, id);
			await loadCalculations();
		} catch (err) {
			console.error('Error deleting calculation:', err);
			error = err.message || 'Failed to delete calculation';
		} finally {
			loading = false;
		}
	}

	function formatDateOnly(dateString) {
		if (!dateString) return 'N/A';
		const d = new Date(dateString);
		return d.toLocaleDateString();
	}
	function formatDateTime(dateString) {
		if (!dateString) return 'N/A';
		const d = new Date(dateString);
		return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
	}
</script>

<div class="calculation-history">
	<div class="history-header">
		<h3>Calculation History</h3>
		<button class="refresh-btn" onclick={loadCalculations} disabled={loading}> 🔄 Refresh </button>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if loading && calculations.length === 0}
		<div class="loading">Loading calculations...</div>
	{:else if calculations.length === 0}
		<div class="empty-state">No calculations yet for this field.</div>
	{:else}
		<div class="calculations-list">
			{#each calculations as calc (calc.id)}
				<div class="calculation-item">
					<div class="calculation-header">
						<div class="calc-info">
							<span class="calc-date">Measured: {formatDateOnly(calc.date)}</span>
							<span class="calc-entered">Saved: {formatDateTime(calc.createdAt)}</span>
							{#if calc.loadNumber}
								<span class="calc-load">Load #{calc.loadNumber}</span>
							{/if}
							{#if calc.operator}
								<span class="calc-operator">Operator: {calc.operator}</span>
							{/if}
						</div>
						<button
							class="btn-delete"
							onclick={() => deleteCalculation(calc.id)}
							disabled={loading}
						>
							×
						</button>
					</div>
					<div class="calculation-details">
						<div class="detail-row">
							<div class="detail-col">
								<span class="detail-label">Wet Weight:</span>
								<span class="detail-value">{calc.wetWeight?.toFixed(2) || '0.00'}</span>
							</div>
							<div class="detail-col">
								<span class="detail-label">Moisture:</span>
								<span class="detail-value">{calc.moistureContent?.toFixed(1) || '0.0'}%</span>
							</div>
						</div>
						<div class="detail-row">
							<div class="detail-col">
								<span class="detail-label">Wet Bushels:</span>
								<span class="detail-value">{calc.calculatedWetBushels?.toFixed(2) || '0.00'}</span>
							</div>
							<div class="detail-col">
								<span class="detail-label">Dry Weight:</span>
								<span class="detail-value">{calc.calculatedDryWeight?.toFixed(2) || '0.00'}</span>
							</div>
						</div>
						<div class="detail-row">
							<div class="detail-col">
								<span class="detail-label">Dry Bushels:</span>
								<span class="detail-value highlight"
									>{calc.calculatedDryBushels?.toFixed(2) || '0.00'}</span
								>
							</div>
							<div class="detail-col">
								<span class="detail-label">Shrink Factor:</span>
								<span class="detail-value">{calc.manualShrinkFactor || '0.000'}</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.calculation-history {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-top: 2rem;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.history-header h3 {
		margin: 0;
		color: var(--color-theme-2);
		font-size: 1.25rem;
	}

	.refresh-btn {
		background: var(--color-theme-2);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #1a5a8a;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #fcc;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.calculations-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.calculation-item {
		background: white;
		border-radius: 4px;
		padding: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.calculation-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.calc-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.calc-date {
		font-weight: 600;
		color: var(--color-text);
		font-size: 0.875rem;
	}
	.calc-entered {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.calc-load {
		font-size: 0.875rem;
		color: var(--color-theme-2);
		font-weight: 600;
	}

	.calc-operator {
		font-size: 0.75rem;
		color: #666;
	}

	.btn-delete {
		background: transparent;
		border: none;
		color: #d32f2f;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
	}

	.btn-delete:hover:not(:disabled) {
		background: rgba(211, 47, 47, 0.1);
	}

	.btn-delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.calculation-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		gap: 1rem;
	}

	.detail-col {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.detail-label {
		font-size: 0.875rem;
		color: #666;
	}

	.detail-value {
		font-weight: 600;
		color: var(--color-text);
		font-size: 0.875rem;
	}

	.detail-value.highlight {
		color: var(--color-theme-2);
		font-size: 1rem;
	}

	@media (max-width: 640px) {
		.detail-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.calc-info {
			font-size: 0.875rem;
		}
	}
</style>
