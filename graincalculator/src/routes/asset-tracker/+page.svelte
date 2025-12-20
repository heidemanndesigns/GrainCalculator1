<script>
	import { equipmentStore } from '$lib/stores/equipmentStore.js';

	let showForm = $state(false);
	let editingId = $state(null);

	let formData = $state({
		name: '',
		type: '',
		serialNumber: '',
		purchaseDate: '',
		warrantyExpiry: '',
		totalHours: 0,
		lastServiceDate: '',
		notes: ''
	});

	// Reactive equipment list from store
	let equipment = $derived(equipmentStore.all);

	function openForm(item) {
		if (item) {
			editingId = item.id;
			formData = { ...item };
		} else {
			editingId = null;
			formData = {
				name: '',
				type: '',
				serialNumber: '',
				purchaseDate: '',
				warrantyExpiry: '',
				totalHours: 0,
				lastServiceDate: '',
				notes: ''
			};
		}
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editingId = null;
	}

	function saveEquipment() {
		if (!formData.name || !formData.type) {
			alert('Please fill in at least name and type');
			return;
		}

		const equipmentItem = {
			...formData,
			id: editingId || undefined
		};

		equipmentStore.save(equipmentItem);
		closeForm();
	}

	function deleteEquipment(id) {
		if (confirm('Are you sure you want to delete this equipment?')) {
			equipmentStore.remove(id);
		}
	}

	function updateHours(id, hours) {
		equipmentStore.updateHours(id, hours);
	}

	function isWarrantyExpiring(expiryDate: string): boolean {
		if (!expiryDate) return false;
		const expiry = new Date(expiryDate);
		const today = new Date();
		const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
	}

	function isWarrantyExpired(expiryDate: string): boolean {
		if (!expiryDate) return false;
		return new Date(expiryDate) < new Date();
	}
</script>

<svelte:head>
	<title>Asset Tracker - Ag Tools</title>
	<meta name="description" content="Track equipment assets, usage, warranty, and serial numbers" />
</svelte:head>

<section class="asset-tracker">
	<div class="header">
		<h1>Equipment Asset Tracker</h1>
		<button class="add-btn" onclick={() => openForm()}>+ Add Equipment</button>
	</div>

	{#if equipment.length === 0}
		<div class="empty-state">
			<p>No equipment added yet. Click "Add Equipment" to get started.</p>
		</div>
	{:else}
		<div class="equipment-grid">
			{#each equipment as item (item.id)}
				<div class="equipment-card">
					<div class="card-header">
						<h3>{item.name}</h3>
						<div class="card-actions">
							<button class="edit-btn" onclick={() => openForm(item)}>Edit</button>
							<button class="delete-btn" onclick={() => deleteEquipment(item.id)}>Delete</button>
						</div>
					</div>

					<div class="card-body">
						<div class="info-row">
							<span class="label">Type:</span>
							<span class="value">{item.type}</span>
						</div>

						<div class="info-row">
							<span class="label">Serial Number:</span>
							<span class="value">{item.serialNumber || 'N/A'}</span>
						</div>

						<div class="info-row">
							<span class="label">Total Hours:</span>
							<div class="hours-input">
								<input
									type="number"
									value={item.totalHours}
									onchange={(e) => updateHours(item.id, Number(e.target.value))}
									min="0"
									step="0.1"
								/>
							</div>
						</div>

						<div class="info-row">
							<span class="label">Purchase Date:</span>
							<span class="value">{item.purchaseDate || 'N/A'}</span>
						</div>

						{#if item.warrantyExpiry}
							<div
								class="info-row warranty {isWarrantyExpired(item.warrantyExpiry)
									? 'expired'
									: isWarrantyExpiring(item.warrantyExpiry)
										? 'expiring'
										: ''}"
							>
								<span class="label">Warranty Expiry:</span>
								<span class="value">
									{item.warrantyExpiry}
									{#if isWarrantyExpired(item.warrantyExpiry)}
										<span class="badge expired-badge">Expired</span>
									{:else if isWarrantyExpiring(item.warrantyExpiry)}
										<span class="badge expiring-badge">Expiring Soon</span>
									{/if}
								</span>
							</div>
						{/if}

						{#if item.lastServiceDate}
							<div class="info-row">
								<span class="label">Last Service:</span>
								<span class="value">{item.lastServiceDate}</span>
							</div>
						{/if}

						{#if item.notes}
							<div class="info-row notes">
								<span class="label">Notes:</span>
								<span class="value">{item.notes}</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if showForm}
		<div class="modal-overlay" onclick={closeForm}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>{editingId ? 'Edit Equipment' : 'Add Equipment'}</h2>
					<button class="close-btn" onclick={closeForm}>×</button>
				</div>

				<form
					class="modal-body"
					onsubmit={(e) => {
						e.preventDefault();
						saveEquipment();
					}}
				>
					<div class="form-group">
						<label for="name">Equipment Name *</label>
						<input id="name" type="text" bind:value={formData.name} required />
					</div>

					<div class="form-group">
						<label for="type">Type *</label>
						<input id="type" type="text" bind:value={formData.type} required placeholder="e.g., Tractor, Combine, Planter" />
					</div>

					<div class="form-group">
						<label for="serial">Serial Number</label>
						<input id="serial" type="text" bind:value={formData.serialNumber} />
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="purchase">Purchase Date</label>
							<input id="purchase" type="date" bind:value={formData.purchaseDate} />
						</div>

						<div class="form-group">
							<label for="warranty">Warranty Expiry</label>
							<input id="warranty" type="date" bind:value={formData.warrantyExpiry} />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="hours">Total Hours</label>
							<input id="hours" type="number" bind:value={formData.totalHours} min="0" step="0.1" />
						</div>

						<div class="form-group">
							<label for="service">Last Service Date</label>
							<input id="service" type="date" bind:value={formData.lastServiceDate} />
						</div>
					</div>

					<div class="form-group">
						<label for="notes">Notes</label>
						<textarea id="notes" bind:value={formData.notes} rows="3"></textarea>
					</div>

					<div class="form-actions">
						<button type="button" class="cancel-btn" onclick={closeForm}>Cancel</button>
						<button type="submit" class="save-btn">Save</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</section>

<style>
	.asset-tracker {
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

	.equipment-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.equipment-card {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid rgba(0, 0, 0, 0.1);
	}

	.card-header h3 {
		margin: 0;
		color: var(--color-theme-2);
		font-size: 1.25rem;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
	}

	.edit-btn,
	.delete-btn {
		padding: 0.25rem 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.edit-btn {
		background: var(--color-theme-2);
		color: white;
	}

	.edit-btn:hover {
		opacity: 0.8;
	}

	.delete-btn {
		background: var(--color-theme-1);
		color: white;
	}

	.delete-btn:hover {
		opacity: 0.8;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.info-row .label {
		font-weight: 600;
		color: var(--color-text);
	}

	.info-row .value {
		color: var(--color-text);
		text-align: right;
	}

	.hours-input input {
		width: 100px;
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.warranty.expired .value {
		color: var(--color-theme-1);
	}

	.warranty.expiring .value {
		color: #ff8800;
	}

	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		margin-left: 0.5rem;
	}

	.expired-badge {
		background: #fee;
		color: var(--color-theme-1);
	}

	.expiring-badge {
		background: #fff4e6;
		color: #ff8800;
	}

	.notes {
		flex-direction: column;
		align-items: flex-start;
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	.notes .value {
		text-align: left;
		margin-top: 0.25rem;
		font-style: italic;
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
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus {
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

		.equipment-grid {
			grid-template-columns: 1fr;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>

