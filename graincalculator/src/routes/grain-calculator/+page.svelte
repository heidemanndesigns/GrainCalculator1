<script>
	let isTopSectionLocked = $state(false);
	let loadNumber = $state('');
	let date = $state('');
	let fieldNumber = $state('');
	let operator = $state('');
	let totalFieldAcres = $state(0);
	let manualShrinkFactor = $state(0);
	let wetWeight = $state(0);
	let moistureContent = $state(0);
	let targetMoisture = $state(15.5); // Standard target moisture for corn

	let dryWeight = $derived(0);
	let shrinkFactor = $derived(0);
	let moistureShrink = $derived(0);

	let calculatedWetBushels = $state(0);
	let calculatedDryWeight = $state(0);
	let calculatedDryBushels = $state(0);
	let showLoadResults = $state(false);
	let showModal = $state(false);
	let displayedLoadNumber = $state('');
	let displayedWetWeight = $state(0);
	let displayedMoistureContent = $state(0);

	$effect(() => {
		if (wetWeight > 0 && moistureContent > 0 && targetMoisture >= 0) {
			// Calculate shrink factor
			shrinkFactor = (100 - moistureContent) / (100 - targetMoisture);
			
			// Calculate dry weight
			dryWeight = wetWeight * shrinkFactor;
			
			// Calculate moisture shrink (weight loss due to moisture)
			moistureShrink = wetWeight - dryWeight;
		} else {
			shrinkFactor = 0;
			dryWeight = 0;
			moistureShrink = 0;
		}
	});

	function enterTopSection() {
		isTopSectionLocked = true;
	}

	function newTopSection() {
		isTopSectionLocked = false;
		date = '';
		fieldNumber = '';
		operator = '';
		totalFieldAcres = 0;
		manualShrinkFactor = 0;
	}

	function enterLoad() {
		// Calculate values
		if (wetWeight > 0 && moistureContent > 0 && manualShrinkFactor > 0) {
			calculatedWetBushels = wetWeight / 56;
			calculatedDryWeight = wetWeight - (wetWeight * (moistureContent - 15) * manualShrinkFactor);
			calculatedDryBushels = calculatedDryWeight / 56;
			
			// Store values for display
			displayedLoadNumber = loadNumber;
			displayedWetWeight = wetWeight;
			displayedMoistureContent = moistureContent;
			
			showLoadResults = true;
			showModal = true;
		}
		
		// TODO: Save/process the load data here
		// Reset the load-specific fields after entering
		loadNumber = '';
		wetWeight = 0;
		moistureContent = 0;
	}

	function closeModal() {
		showModal = false;
	}

	function viewPreviousLoadResults() {
		// TODO: Implement view previous load results functionality
		closeModal();
	}
</script>

<svelte:head>
	<title>Dry Grain Calculator - Ag Tools</title>
	<meta name="description" content="Calculate dry grain weight and moisture shrink" />
</svelte:head>

<section class="calculator">
	<h1>Dry Grain Calculator</h1>
	<p class="description">
		Calculate the dry weight of grain after accounting for moisture content. Enter the wet weight
		and current moisture percentage to determine the dry weight at your target moisture level.
	</p>

	<div class="form-container">
		<div class="top-section" class:locked={isTopSectionLocked}>
			<div class="input-row">
				<div class="input-group">
					<label for="date">Date</label>
					<input
						id="date"
						type="date"
						bind:value={date}
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="operator">Operator</label>
					<input
						id="operator"
						type="text"
						bind:value={operator}
						placeholder="Enter operator name"
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="field-number">Field Number</label>
					<input
						id="field-number"
						type="text"
						bind:value={fieldNumber}
						placeholder="Enter field number"
						disabled={isTopSectionLocked}
					/>
				</div>
			</div>

			<div class="input-row">
				<div class="input-group">
					<label for="total-field-acres">Total Field Acres</label>
					<input
						id="total-field-acres"
						type="number"
						step="0.01"
						min="0"
						bind:value={totalFieldAcres}
						placeholder="0"
						disabled={isTopSectionLocked}
					/>
				</div>

				<div class="input-group">
					<label for="manual-shrink-factor">Shrink Factor</label>
					<select
						id="manual-shrink-factor"
						bind:value={manualShrinkFactor}
						disabled={isTopSectionLocked}
					>
						<option value={0}>Select shrink factor</option>
						<option value={0.013}>0.013</option>
						<option value={0.0135}>0.0135</option>
						<option value={0.014}>0.014</option>
						<option value={0.0145}>0.0145</option>
						<option value={0.015}>0.015</option>
					</select>
				</div>
			</div>

			<div class="top-section-buttons">
				<button class="enter-btn" onclick={enterTopSection} disabled={isTopSectionLocked}>Enter</button>
				<button class="new-btn" onclick={newTopSection}>New</button>
			</div>
		</div>

		<hr class="form-divider" />

		<div class="input-group">
			<label for="load-number">Load Number</label>
			<input
				id="load-number"
				type="text"
				bind:value={loadNumber}
				placeholder="Enter load number"
				disabled={!isTopSectionLocked}
			/>
		</div>

		<div class="input-row">
			<div class="input-group">
				<label for="wet-weight">Wet Weight</label>
				<input
					id="wet-weight"
					type="number"
					step="0.01"
					min="0"
					bind:value={wetWeight}
					placeholder="0"
					disabled={!isTopSectionLocked}
				/>
			</div>

			<div class="input-group">
				<label for="moisture">Current Moisture Content (%)</label>
				<input
					id="moisture"
					type="number"
					step="0.1"
					min="0"
					max="100"
					bind:value={moistureContent}
					placeholder="0"
					disabled={!isTopSectionLocked}
				/>
			</div>
		</div>

		<button class="reset-btn" onclick={enterLoad} disabled={!isTopSectionLocked}>Calculate and Enter Load</button>
	</div>
</section>

{#if showModal}
	<div 
		class="modal-overlay" 
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<article 
			class="modal-content" 
			onclick={(e) => e.stopPropagation()}
		>
			<button class="modal-close" onclick={closeModal}>×</button>
			<div class="load-results">
				<h2 id="modal-title">Load Calculation Results</h2>
				<div class="result-card">
					<div class="result-item">
						<span class="label">Load Number:</span>
						<span class="value">{displayedLoadNumber || 'N/A'}</span>
					</div>
					<div class="result-item">
						<span class="label">Wet Weight:</span>
						<span class="value">{displayedWetWeight.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Current Moisture Content:</span>
						<span class="value">{displayedMoistureContent.toFixed(1)}%</span>
					</div>
					<div class="result-item">
						<span class="label">Wet Bushels:</span>
						<span class="value">{calculatedWetBushels.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Dry Weight:</span>
						<span class="value">{calculatedDryWeight.toFixed(2)}</span>
					</div>
					<div class="result-item">
						<span class="label">Dry Bushels:</span>
						<span class="value">{calculatedDryBushels.toFixed(2)}</span>
					</div>
				</div>
				<button class="view-previous-btn" onclick={viewPreviousLoadResults}>View Previous Load Results</button>
			</div>
		</article>
	</div>
{/if}

<style>
	.calculator {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 0.5rem;
		color: var(--color-theme-2);
	}

	.description {
		text-align: center;
		margin-bottom: 2rem;
		color: var(--color-text);
		opacity: 0.8;
	}

	.form-container {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.input-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.input-row .input-group {
		flex: 1;
		margin-bottom: 0;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	.input-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.input-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.input-group input:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.input-group input:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.input-group select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
		background-color: white;
	}

	.input-group select:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.input-group select:disabled {
		background-color: #e0e0e0;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.top-section.locked {
		opacity: 0.7;
	}

	.top-section-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		margin-bottom: 0;
	}

	.enter-btn,
	.new-btn {
		flex: 1;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.enter-btn {
		background: #4caf50;
		color: white;
	}

	.enter-btn:hover:not(:disabled) {
		background: #45a049;
	}

	.enter-btn:disabled {
		background: #cccccc;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.new-btn {
		background: #2196f3;
		color: white;
	}

	.new-btn:hover {
		background: #0b7dda;
	}

	.form-divider {
		border: none;
		border-top: 2px solid rgba(0, 0, 0, 0.1);
		margin: 1.5rem 0;
	}

	.reset-btn {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-theme-1);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.reset-btn:hover:not(:disabled) {
		background: #cc2e00;
	}

	.reset-btn:disabled {
		background: #cccccc;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		position: relative;
		background: white;
		border-radius: 8px;
		padding: 2rem;
		max-width: 600px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: none;
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		color: var(--color-text);
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background 0.2s;
	}

	.modal-close:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.load-results {
		background: transparent;
		padding: 0;
		margin: 0;
		box-shadow: none;
	}

	.view-previous-btn {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-theme-2);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 1.5rem;
	}

	.view-previous-btn:hover {
		background: #1a5a8a;
	}

	.load-results h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: var(--color-theme-2);
		text-align: center;
	}

	.result-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.result-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 4px;
	}

	.result-item .label {
		font-weight: 600;
		color: var(--color-text);
	}

	.result-item .value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-theme-2);
	}

	@media (max-width: 640px) {
		.input-row {
			flex-direction: column;
		}

		.input-row .input-group {
			margin-bottom: 1.5rem;
		}
	}

</style>

