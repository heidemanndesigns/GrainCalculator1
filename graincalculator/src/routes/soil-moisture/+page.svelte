<script>
	import { soilMoistureStore } from '$lib/stores/soilMoistureStore.js';

	let showFieldForm = $state(false);
	let showReadingForm = $state(false);
	let editingFieldId = $state(null);
	let selectedFieldId = $state(null);

	let fieldFormData = $state({
		name: '',
		fieldNumber: '',
		acres: 0,
		location: ''
	});

	let readingFormData = $state({
		date: new Date().toISOString().split('T')[0],
		moistureLevel: 0,
		depth: '0-6"',
		notes: ''
	});

	// Reactive fields list from store
	let fields = $derived(soilMoistureStore.allFields);

	function openFieldForm(field) {
		if (field) {
			editingFieldId = field.id;
			fieldFormData = {
				name: field.name,
				fieldNumber: field.fieldNumber || '',
				acres: field.acres,
				location: field.location
			};
		} else {
			editingFieldId = null;
			fieldFormData = {
				name: '',
				fieldNumber: '',
				acres: 0,
				location: ''
			};
		}
		showFieldForm = true;
	}

	function closeFieldForm() {
		showFieldForm = false;
		editingFieldId = null;
	}

	function handleFieldFormOverlayClick(event) {
		if (event.target === event.currentTarget) {
			closeFieldForm();
		}
	}

	function saveField() {
		if (!fieldFormData.name) {
			alert('Please enter a field name');
			return;
		}

		const field = {
			...fieldFormData,
			id: editingFieldId || undefined,
			readings: editingFieldId ? soilMoistureStore.getFieldById(editingFieldId)?.readings || [] : []
		};

		soilMoistureStore.saveField(field);
		closeFieldForm();
	}

	function deleteField(id) {
		if (confirm('Are you sure you want to delete this field and all its readings?')) {
			soilMoistureStore.deleteField(id);
		}
	}

	function openReadingForm(fieldId, reading) {
		selectedFieldId = fieldId;
		if (reading) {
			readingFormData = { ...reading };
		} else {
			readingFormData = {
				date: new Date().toISOString().split('T')[0],
				moistureLevel: 0,
				depth: '0-6"',
				notes: ''
			};
		}
		showReadingForm = true;
	}

	function closeReadingForm() {
		showReadingForm = false;
		selectedFieldId = null;
	}

	function handleReadingFormOverlayClick(event) {
		if (event.target === event.currentTarget) {
			closeReadingForm();
		}
	}

	function saveReading() {
		if (!selectedFieldId) return;

		soilMoistureStore.saveReading(selectedFieldId, readingFormData);
		closeReadingForm();
	}

	function deleteReading(fieldId, readingId) {
		soilMoistureStore.deleteReading(fieldId, readingId);
	}

	function getLatestReading(field) {
		if (field.readings.length === 0) return null;
		return field.readings[0]; // Already sorted by date
	}

	function getMoistureStatus(level) {
		if (level < 30) return 'Dry';
		if (level < 50) return 'Moderate';
		if (level < 70) return 'Adequate';
		return 'Wet';
	}

	function getMoistureColor(level) {
		if (level < 30) return '#dc2626'; // red
		if (level < 50) return '#f59e0b'; // orange
		if (level < 70) return '#10b981'; // green
		return '#3b82f6'; // blue
	}
</script>

<svelte:head>
	<title>Soil Moisture Tracker - Ag Tools</title>
	<meta name="description" content="Track soil moisture levels across your fields" />
</svelte:head>

<section class="soil-moisture">
	<div class="header">
		<h1>Soil Moisture Tracker</h1>
		<button class="add-btn" onclick={() => openFieldForm()}>+ Add Field</button>
	</div>

	{#if fields.length === 0}
		<div class="empty-state">
			<p>No fields added yet. Click "Add Field" to get started tracking soil moisture.</p>
		</div>
	{:else}
		<div class="fields-grid">
			{#each fields as field (field.id)}
				<div class="field-card">
					<div class="field-header">
						<div>
							<h3>{field.name}</h3>
							<p class="field-info">
								{#if field.fieldNumber}Field #{field.fieldNumber}{/if}
								{#if field.fieldNumber && field.acres > 0} • {/if}
								{#if field.acres > 0}{field.acres} acres{/if}
								{#if field.location && (field.fieldNumber || field.acres > 0)} • {/if}
								{#if field.location}{field.location}{/if}
							</p>
						</div>
						<div class="field-actions">
							<button class="add-reading-btn" onclick={() => openReadingForm(field.id)}>
								+ Reading
							</button>
							<button class="edit-btn" onclick={() => openFieldForm(field)}>Edit</button>
							<button class="delete-btn" onclick={() => deleteField(field.id)}>Delete</button>
						</div>
					</div>

					{#if field.readings.length === 0}
						<div class="no-readings">
							<p>No moisture readings yet. Click "+ Reading" to add one.</p>
						</div>
					{:else}
						<div class="readings-section">
							<div class="latest-reading">
								<h4>Latest Reading</h4>
								{#if getLatestReading(field)}
									{@const latest = getLatestReading(field)}
									<div
										class="moisture-indicator"
										style="background-color: {getMoistureColor(latest.moistureLevel)}20; border-color: {getMoistureColor(latest.moistureLevel)}"
									>
										<div class="moisture-value">
											<span class="level">{latest.moistureLevel}%</span>
											<span class="status">{getMoistureStatus(latest.moistureLevel)}</span>
										</div>
										<div class="moisture-details">
											<span>{latest.date}</span>
											<span>•</span>
											<span>{latest.depth}</span>
										</div>
										{#if latest.notes}
											<div class="reading-notes">{latest.notes}</div>
										{/if}
									</div>
								{/if}
							</div>

							{#if field.readings.length > 1}
								<div class="readings-history">
									<h4>Reading History</h4>
									<div class="readings-list">
										{#each field.readings.slice(1) as reading (reading.id)}
											<div class="reading-item">
												<div class="reading-info">
													<span class="reading-date">{reading.date}</span>
													<span
														class="reading-level"
														style="color: {getMoistureColor(reading.moistureLevel)}"
													>
														{reading.moistureLevel}%
													</span>
													<span class="reading-depth">{reading.depth}</span>
												</div>
												<div class="reading-actions">
													<button
														class="edit-reading-btn"
														onclick={() => openReadingForm(field.id, reading)}
													>
														Edit
													</button>
													<button
														class="delete-reading-btn"
														onclick={() => deleteReading(field.id, reading.id)}
													>
														Delete
													</button>
												</div>
												{#if reading.notes}
													<div class="reading-notes-small">{reading.notes}</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if showFieldForm}
		<div 
			class="modal-overlay" 
			onclick={handleFieldFormOverlayClick}
			onkeydown={(e) => e.key === 'Escape' && closeFieldForm()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="field-form-title"
			tabindex="-1"
		>
			<article class="modal">
				<div class="modal-content">
					<div class="modal-header">
						<h2 id="field-form-title">{editingFieldId ? 'Edit Field' : 'Add Field'}</h2>
						<button class="close-btn" onclick={closeFieldForm} aria-label="Close dialog">×</button>
					</div>

					<form
						class="modal-body"
						onsubmit={(e) => {
							e.preventDefault();
							saveField();
						}}
					>
						<div class="form-group">
							<label for="field-name">Field Name *</label>
							<input id="field-name" type="text" bind:value={fieldFormData.name} required />
						</div>

						<div class="form-group">
							<label for="field-number">Field Number</label>
							<input id="field-number" type="text" bind:value={fieldFormData.fieldNumber} />
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="acres">Acres</label>
								<input
									id="acres"
									type="number"
									bind:value={fieldFormData.acres}
									min="0"
									step="0.1"
								/>
							</div>

							<div class="form-group">
								<label for="location">Location</label>
								<input id="location" type="text" bind:value={fieldFormData.location} />
							</div>
						</div>

						<div class="form-actions">
							<button type="button" class="cancel-btn" onclick={closeFieldForm}>Cancel</button>
							<button type="submit" class="save-btn">Save</button>
						</div>
					</form>
				</div>
			</article>
		</div>
	{/if}

	{#if showReadingForm}
		<div 
			class="modal-overlay" 
			onclick={handleReadingFormOverlayClick}
			onkeydown={(e) => e.key === 'Escape' && closeReadingForm()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="reading-form-title"
			tabindex="-1"
		>
			<article class="modal">
				<div class="modal-content">
					<div class="modal-header">
						<h2 id="reading-form-title">{readingFormData.id ? 'Edit Reading' : 'Add Reading'}</h2>
						<button class="close-btn" onclick={closeReadingForm} aria-label="Close dialog">×</button>
					</div>

					<form
						class="modal-body"
						onsubmit={(e) => {
							e.preventDefault();
							saveReading();
						}}
					>
						<div class="form-group">
							<label for="reading-date">Date *</label>
							<input id="reading-date" type="date" bind:value={readingFormData.date} required />
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="moisture">Moisture Level (%) *</label>
								<input
									id="moisture"
									type="number"
									bind:value={readingFormData.moistureLevel}
									min="0"
									max="100"
									step="0.1"
									required
								/>
							</div>

							<div class="form-group">
								<label for="depth">Depth</label>
								<select id="depth" bind:value={readingFormData.depth}>
									<option value="0-6&quot;">0-6"</option>
									<option value="6-12&quot;">6-12"</option>
									<option value="12-18&quot;">12-18"</option>
									<option value="18-24&quot;">18-24"</option>
									<option value="24-36&quot;">24-36"</option>
									<option value="36&quot;+">36"+</option>
								</select>
							</div>
						</div>

						<div class="form-group">
							<label for="reading-notes">Notes</label>
							<textarea id="reading-notes" bind:value={readingFormData.notes} rows="3"></textarea>
						</div>

						<div class="form-actions">
							<button type="button" class="cancel-btn" onclick={closeReadingForm}>Cancel</button>
							<button type="submit" class="save-btn">Save</button>
						</div>
					</form>
				</div>
			</article>
		</div>
	{/if}
</section>

<style>
	.soil-moisture {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--color-theme-2);
		margin: 0;
	}

	.add-btn {
		padding: 0.75rem 1.5rem;
		background: var(--color-theme-2);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.add-btn:hover {
		background: #2d5a87;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		color: var(--color-text);
	}

	.fields-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.field-card {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.field-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid rgba(0, 0, 0, 0.1);
	}

	.field-header h3 {
		margin: 0 0 0.25rem 0;
		color: var(--color-theme-2);
		font-size: 1.25rem;
	}

	.field-info {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.field-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.add-reading-btn,
	.edit-btn,
	.delete-btn {
		padding: 0.25rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.add-reading-btn {
		background: var(--color-theme-2);
		color: white;
	}

	.edit-btn {
		background: #10b981;
		color: white;
	}

	.delete-btn {
		background: var(--color-theme-1);
		color: white;
	}

	.add-reading-btn:hover,
	.edit-btn:hover,
	.delete-btn:hover {
		opacity: 0.8;
	}

	.no-readings {
		text-align: center;
		padding: 2rem;
		color: var(--color-text);
		opacity: 0.6;
	}

	.readings-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.latest-reading h4,
	.readings-history h4 {
		margin: 0 0 0.75rem 0;
		color: var(--color-text);
		font-size: 1rem;
		font-weight: 600;
	}

	.moisture-indicator {
		padding: 1rem;
		border-radius: 8px;
		border: 2px solid;
	}

	.moisture-value {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
	}

	.level {
		font-size: 2rem;
		font-weight: 700;
	}

	.status {
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.moisture-details {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text);
		opacity: 0.7;
		margin-bottom: 0.5rem;
	}

	.reading-notes {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		font-size: 0.875rem;
		font-style: italic;
		color: var(--color-text);
		opacity: 0.8;
	}

	.readings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.reading-item {
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 4px;
	}

	.reading-info {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.reading-date {
		font-weight: 600;
		color: var(--color-text);
	}

	.reading-level {
		font-weight: 700;
		font-size: 1.125rem;
	}

	.reading-depth {
		font-size: 0.875rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.reading-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.edit-reading-btn,
	.delete-reading-btn {
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.edit-reading-btn {
		background: #10b981;
		color: white;
	}

	.delete-reading-btn {
		background: var(--color-theme-1);
		color: white;
	}

	.edit-reading-btn:hover,
	.delete-reading-btn:hover {
		opacity: 0.8;
	}

	.reading-notes-small {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		font-style: italic;
		color: var(--color-text);
		opacity: 0.7;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 8px;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 2px solid rgba(0, 0, 0, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		color: var(--color-theme-2);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: var(--color-text);
		line-height: 1;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: var(--color-theme-1);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	.cancel-btn,
	.save-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.cancel-btn {
		background: #ccc;
		color: var(--color-text);
	}

	.cancel-btn:hover {
		opacity: 0.8;
	}

	.save-btn {
		background: var(--color-theme-2);
		color: white;
	}

	.save-btn:hover {
		opacity: 0.8;
	}

	@media (max-width: 640px) {
		.header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.add-btn {
			width: 100%;
		}

		.fields-grid {
			grid-template-columns: 1fr;
		}

		.field-header {
			flex-direction: column;
			gap: 1rem;
		}

		.field-actions {
			width: 100%;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
