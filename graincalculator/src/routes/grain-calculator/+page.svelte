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
			showLoadResults = true;
		}
		
		// TODO: Save/process the load data here
		// Reset the load-specific fields after entering
		loadNumber = '';
		wetWeight = 0;
		moistureContent = 0;
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
					<input
						id="manual-shrink-factor"
						type="number"
						step="0.0001"
						min="0"
						bind:value={manualShrinkFactor}
						placeholder="0"
						disabled={isTopSectionLocked}
					/>
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
				/>
			</div>
		</div>

		<button class="reset-btn" onclick={enterLoad}>Calculate and Enter Load</button>
	</div>

	{#if showLoadResults}
		<div class="load-results">
			<h2>Load Calculation Results</h2>
			<div class="result-card">
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
		</div>
	{/if}

	{#if dryWeight > 0}
		<div class="results">
			<h2>Results</h2>
			<div class="result-card">
				<div class="result-item">
					<span class="label">Dry Weight:</span>
					<span class="value">{dryWeight.toFixed(2)}</span>
				</div>
				<div class="result-item">
					<span class="label">Shrink Factor:</span>
					<span class="value">{shrinkFactor.toFixed(4)}</span>
				</div>
				<div class="result-item">
					<span class="label">Moisture Shrink:</span>
					<span class="value">{moistureShrink.toFixed(2)}</span>
				</div>
			</div>
		</div>
	{/if}
</section>

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

	.reset-btn:hover {
		background: #cc2e00;
	}

	.results,
	.load-results {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-top: 2rem;
	}

	.results h2,
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

	@media (min-width: 640px) {
		.result-card {
			flex-direction: row;
			flex-wrap: wrap;
		}

		.result-item {
			flex: 1;
			min-width: 200px;
		}
	}
</style>

