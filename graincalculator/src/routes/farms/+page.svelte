<script>
	import { farmStore } from '$lib/stores/farmStore.svelte.js';
	import { fieldStore } from '$lib/stores/fieldStore.svelte.js';
	import { UserService } from '$lib/services/userService.js';
	import { authStore } from '$lib/stores/authStore.js';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Authentication check
	let authState = $state(get(authStore));

	// Subscribe to auth store changes
	$effect(() => {
		const unsubscribe = authStore.subscribe((state) => {
			authState = state;
			console.log('[FarmsPage] auth state changed', {
				loading: state.loading,
				userId: state.user?.uid,
				email: state.user?.email
			});

			// Redirect to login if not authenticated
			if (browser && !state.loading && !state.user) {
				goto(resolve('/login'));
			}
		});
		return unsubscribe;
	});

	let user = $derived(authState.user);
	let loading = $derived(authState.loading);

	// Farm management state
	let farms = $state([]);
	let farmsLoading = $state(false);
	let showFarmForm = $state(false);
	let showMemberForm = $state(false);
	let editingFarmId = $state(null);
	let selectedFarmId = $state(null);
	let error = $state('');

	let farmFormData = $state({
		name: ''
	});
	// Field creation within farm edit modal
	let modalFields = $state([]);
	let modalFieldsLoading = $state(false);
	let newField = $state({ name: '', acres: 0 });
	let editingFieldId = $state(null);
	let editingField = $state({ name: '', acres: 0 });

	async function loadFieldsForFarm(farmId) {
		if (!farmId) {
			modalFields = [];
			return;
		}
		modalFieldsLoading = true;
		try {
			modalFields = await fieldStore.getAll(farmId);
		} catch (e) {
			console.error('Error loading fields for farm:', e);
			modalFields = [];
		} finally {
			modalFieldsLoading = false;
		}
	}

	async function createFieldInModal() {
		if (!editingFarmId) return;
		if (!newField.name.trim() || Number(newField.acres) <= 0) {
			error = 'Please provide a field name and acres';
			return;
		}
		modalFieldsLoading = true;
		try {
			await fieldStore.create(editingFarmId, {
				name: newField.name.trim(),
				acres: Number(newField.acres)
			});
			newField = { name: '', acres: 0 };
			await loadFieldsForFarm(editingFarmId);
		} catch (e) {
			console.error('Error creating field:', e);
			error = e.message || 'Failed to create field';
		} finally {
			modalFieldsLoading = false;
		}
	}

	function startEditField(f) {
		editingFieldId = f.id;
		editingField = { name: f.name, acres: f.acres };
	}

	function cancelEditField() {
		editingFieldId = null;
		editingField = { name: '', acres: 0 };
	}

	async function saveEditField() {
		if (!editingFarmId || !editingFieldId) return;
		if (!editingField.name.trim() || Number(editingField.acres) <= 0) {
			error = 'Please provide a field name and acres';
			return;
		}
		modalFieldsLoading = true;
		try {
			await fieldStore.update(editingFarmId, editingFieldId, {
				name: editingField.name.trim(),
				acres: Number(editingField.acres)
			});
			cancelEditField();
			await loadFieldsForFarm(editingFarmId);
		} catch (e) {
			console.error('Error updating field:', e);
			error = e.message || 'Failed to update field';
		} finally {
			modalFieldsLoading = false;
		}
	}

	async function deleteFieldInModal(fieldId) {
		if (!editingFarmId || !fieldId) return;
		if (!confirm('Delete this field? This will not remove existing calculations, but they may be orphaned.')) return;
		modalFieldsLoading = true;
		try {
			await fieldStore.remove(editingFarmId, fieldId);
			if (editingFieldId === fieldId) cancelEditField();
			await loadFieldsForFarm(editingFarmId);
		} catch (e) {
			console.error('Error deleting field:', e);
			error = e.message || 'Failed to delete field';
		} finally {
			modalFieldsLoading = false;
		}
	}

	let memberEmail = $state('');

	// Load farms when user is available
	$effect(() => {
		if (user && !loading) {
			console.log('[FarmsPage] user available, loading farms', { userId: user?.uid });
			loadFarms();
		}
	});

	async function loadFarms() {
		if (!user) return;
		console.log('[FarmsPage] loadFarms() start', { userId: user?.uid });
		farmsLoading = true;
		try {
			farms = await farmStore.getAll();
			console.log('[FarmsPage] loadFarms() result', { count: farms?.length });
		} catch (err) {
			console.error('Error loading farms:', err);
			error = 'Failed to load farms';
		} finally {
			farmsLoading = false;
		}
	}

	function openFarmForm(farm) {
		if (farm) {
			console.log('[FarmsPage] openFarmForm(edit)', { id: farm.id, name: farm.name });
			editingFarmId = farm.id;
			farmFormData = {
				name: farm.name
			};
			loadFieldsForFarm(farm.id);
		} else {
			console.log('[FarmsPage] openFarmForm(create)');
			editingFarmId = null;
			farmFormData = {
				name: ''
			};
			modalFields = [];
			newField = { name: '', acres: 0 };
		}
		error = '';
		showFarmForm = true;
	}

	function closeFarmForm() {
		showFarmForm = false;
		editingFarmId = null;
		error = '';
	}

	async function saveFarm() {
		console.log('[FarmsPage] saveFarm() invoked', {
			editingFarmId,
			form: { ...farmFormData },
			userId: user?.uid
		});
		if (!farmFormData.name.trim()) {
			error = 'Farm name is required';
			return;
		}

		farmsLoading = true;
		error = '';
		try {
			if (editingFarmId) {
				console.log('[FarmsPage] updating farm', { id: editingFarmId });
				const updated = await farmStore.update(editingFarmId, { name: farmFormData.name.trim() });
				console.log('[FarmsPage] update complete', { updated });
			} else {
				console.log('[FarmsPage] creating farm with name', farmFormData.name.trim());
				const created = await farmStore.create({ name: farmFormData.name.trim() });
				console.log('[FarmsPage] create complete', { created });
			}
			await loadFarms();
			closeFarmForm();
		} catch (err) {
			console.error('Error saving farm:', err);
			error = err.message || 'Failed to save farm';
		} finally {
			farmsLoading = false;
		}
	}

	async function deleteFarm(id) {
		console.log('[FarmsPage] deleteFarm()', { id });
		if (!confirm('Are you sure you want to delete this farm? This will also delete all fields and calculations associated with it.')) {
			return;
		}

		farmsLoading = true;
		error = '';
		try {
			await farmStore.remove(id);
			await loadFarms();
		} catch (err) {
			console.error('Error deleting farm:', err);
			error = err.message || 'Failed to delete farm';
		} finally {
			farmsLoading = false;
		}
	}

	function openMemberForm(farmId) {
		console.log('[FarmsPage] openMemberForm()', { farmId });
		selectedFarmId = farmId;
		memberEmail = '';
		error = '';
		showMemberForm = true;
	}

	function closeMemberForm() {
		showMemberForm = false;
		selectedFarmId = null;
		memberEmail = '';
		error = '';
	}

	async function addMember() {
		console.log('[FarmsPage] addMember()', { selectedFarmId, memberEmail });
		if (!memberEmail.trim()) {
			error = 'Email is required';
			return;
		}

		farmsLoading = true;
		error = '';
		try {
			// Find user by email
			const userToAdd = await UserService.findByEmail(memberEmail.trim());
			if (!userToAdd) {
				error = 'User with this email not found. Please make sure they have registered for the app.';
				farmsLoading = false;
				return;
			}

			await farmStore.addMember(selectedFarmId, userToAdd.id);
			console.log('[FarmsPage] member added', { selectedFarmId, memberUserId: userToAdd.id });
			await loadFarms();
			closeMemberForm();
		} catch (err) {
			console.error('Error adding member:', err);
			error = err.message || 'Failed to add member';
		} finally {
			farmsLoading = false;
		}
	}

	async function removeMember(farmId, memberUserId) {
		console.log('[FarmsPage] removeMember()', { farmId, memberUserId });
		if (!confirm('Are you sure you want to remove this member from the farm?')) {
			return;
		}

		farmsLoading = true;
		error = '';
		try {
			await farmStore.removeMember(farmId, memberUserId);
			await loadFarms();
		} catch (err) {
			console.error('Error removing member:', err);
			error = err.message || 'Failed to remove member';
		} finally {
			farmsLoading = false;
		}
	}

	function isOwner(farm) {
		return user && farm.ownerId === user.uid;
	}
</script>

<svelte:head>
	<title>Farm Management - Ag Tools</title>
	<meta name="description" content="Manage your farms, fields, and team members" />
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading">Checking authentication...</div>
	</div>
{:else if user}
<section class="farms">
	<div class="header">
		<h1>Farm Management</h1>
		<button class="add-btn" onclick={() => openFarmForm()} disabled={farmsLoading}>
			+ Create Farm
		</button>
	</div>

	{#if error && !showFarmForm && !showMemberForm}
		<div class="error-message">{error}</div>
	{/if}

	{#if farmsLoading && farms.length === 0}
		<div class="loading-container">
			<div class="loading">Loading farms...</div>
		</div>
	{:else if farms.length === 0}
		<div class="empty-state">
			<p>No farms yet. Click "Create Farm" to get started.</p>
		</div>
	{:else}
		<div class="farms-grid">
			{#each farms as farm (farm.id)}
				<div class="farm-card">
					<div class="farm-header">
						<h2>{farm.name}</h2>
						<div class="farm-badge" class:owner={isOwner(farm)}>
							{isOwner(farm) ? 'Owner' : 'Member'}
						</div>
					</div>

					<div class="farm-details">
						<div class="detail-item">
							<span class="label">Members:</span>
							<span class="value">{farm.memberIds?.length || 0}</span>
						</div>
					</div>

					<div class="farm-actions">
						{#if isOwner(farm)}
							<button class="btn btn-secondary" onclick={() => openFarmForm(farm)} disabled={farmsLoading}>
								Edit
							</button>
							<button class="btn btn-secondary" onclick={() => openMemberForm(farm.id)} disabled={farmsLoading}>
								Manage Members
							</button>
							<button class="btn btn-danger" onclick={() => deleteFarm(farm.id)} disabled={farmsLoading}>
								Delete
							</button>
						{/if}
					</div>

					{#if farm.memberIds && farm.memberIds.length > 0}
						<div class="members-list">
							<h3>Members</h3>
							<ul>
								{#each farm.memberIds as memberId (memberId)}
									<li>
										{memberId === farm.ownerId ? '👑 ' : ''}
										{memberId === user.uid ? 'You' : memberId.substring(0, 8) + '...'}
										{#if isOwner(farm) && memberId !== farm.ownerId}
											<button class="btn-remove" onclick={() => removeMember(farm.id, memberId)} disabled={farmsLoading}>
												Remove
											</button>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
{/if}

{#if user && showFarmForm}
	<div
		class="modal-overlay"
		role="button"
		tabindex="0"
		aria-label="Close modal"
		onclick={(e) => {
			if (e.currentTarget === e.target) closeFarmForm();
		}}
		onkeydown={(e) => {
			// Only close on Escape and only when the overlay itself has focus
			if (e.currentTarget === e.target && e.key === 'Escape') closeFarmForm();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-header">
				<h2 id="modal-title">{editingFarmId ? 'Edit Farm' : 'Create Farm'}</h2>
				<button class="close-btn" onclick={closeFarmForm}>×</button>
			</div>

			<div class="modal-body">
				{#if error}
					<div class="error-message">{error}</div>
				{/if}
				{#if farmsLoading}
					<div class="saving-message">{editingFarmId ? 'Updating farm...' : 'Creating farm...'}</div>
				{/if}

				<form
					aria-busy={farmsLoading}
					onsubmit={(e) => {
						e.preventDefault();
						saveFarm();
					}}
				>
					<div class="form-group">
						<label for="farm-name">Farm Name *</label>
						<input
							id="farm-name"
							type="text"
							bind:value={farmFormData.name}
							required
							placeholder="Enter farm name"
							disabled={farmsLoading}
							onkeydown={(e) => e.stopPropagation()}
						/>
					</div>

					<div class="form-actions">
						<button type="button" class="btn btn-secondary" onclick={closeFarmForm} disabled={farmsLoading}>
							Cancel
						</button>
						<button type="submit" class="btn btn-primary" disabled={farmsLoading || !farmFormData.name.trim()}>
							{farmsLoading ? 'Saving...' : (editingFarmId ? 'Update' : 'Create')}
						</button>
					</div>
				</form>
				{#if editingFarmId}
					<hr class="section-divider" />
					<h3>Fields</h3>
					{#if modalFieldsLoading}
						<div class="saving-message">Loading fields...</div>
					{:else}
						{#if modalFields.length === 0}
							<p class="muted">No fields yet. Create one below.</p>
						{:else}
							<ul class="fields-list">
								{#each modalFields as f}
									<li>
										{#if editingFieldId === f.id}
											<div class="edit-field-row">
												<input
													type="text"
													bind:value={editingField.name}
													placeholder="Field name"
													disabled={modalFieldsLoading}
													onkeydown={(e) => e.stopPropagation()}
												/>
												<input
													type="number"
													step="0.01"
													min="0"
													bind:value={editingField.acres}
													placeholder="Acres"
													disabled={modalFieldsLoading}
													onkeydown={(e) => e.stopPropagation()}
												/>
												<div class="row-actions">
													<button type="button" class="btn btn-primary btn-sm" onclick={saveEditField} disabled={modalFieldsLoading}>
														Save
													</button>
													<button type="button" class="btn btn-secondary btn-sm" onclick={cancelEditField} disabled={modalFieldsLoading}>
														Cancel
													</button>
												</div>
											</div>
										{:else}
											<div class="field-info">
												<span class="field-name">{f.name}</span>
												<span class="chip">{f.acres} acres</span>
											</div>
											<div class="row-actions">
												<button type="button" class="link-btn" onclick={() => startEditField(f)} disabled={modalFieldsLoading}>Edit</button>
												<button type="button" class="link-btn danger" onclick={() => deleteFieldInModal(f.id)} disabled={modalFieldsLoading}>Delete</button>
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					{/if}

					<form
						class="inline-form"
						onsubmit={(e) => {
							e.preventDefault();
							createFieldInModal();
						}}
					>
						<div class="form-row">
							<div class="form-group">
								<label for="new-field-name">Field Name *</label>
								<input
									id="new-field-name"
									type="text"
									bind:value={newField.name}
									placeholder="e.g., North 40"
									required
									disabled={modalFieldsLoading}
									onkeydown={(e) => e.stopPropagation()}
								/>
							</div>
							<div class="form-group">
								<label for="new-field-acres">Acres *</label>
								<input
									id="new-field-acres"
									type="number"
									step="0.01"
									min="0"
									bind:value={newField.acres}
									required
									disabled={modalFieldsLoading}
									onkeydown={(e) => e.stopPropagation()}
								/>
							</div>
						</div>
						<div class="form-actions">
							<button type="submit" class="btn btn-primary" disabled={modalFieldsLoading || !newField.name.trim() || Number(newField.acres) <= 0}>
								{modalFieldsLoading ? 'Creating...' : 'Add Field'}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if user && showMemberForm}
	<div
		class="modal-overlay"
		role="button"
		tabindex="0"
		aria-label="Close modal"
		onclick={(e) => {
			if (e.currentTarget === e.target) closeMemberForm();
		}}
		onkeydown={(e) => {
			// Only close on Escape and only when the overlay itself has focus
			if (e.currentTarget === e.target && e.key === 'Escape') closeMemberForm();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="member-modal-title">
			<div class="modal-header">
				<h2 id="member-modal-title">Add Member</h2>
				<button class="close-btn" onclick={closeMemberForm}>×</button>
			</div>

			<div class="modal-body">
				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<form
					aria-busy={farmsLoading}
					onsubmit={(e) => {
						e.preventDefault();
						addMember();
					}}
				>
					<div class="form-group">
						<label for="member-email">User Email *</label>
						<input
							id="member-email"
							type="email"
							bind:value={memberEmail}
							required
							placeholder="Enter user email"
							disabled={farmsLoading}
							onkeydown={(e) => e.stopPropagation()}
						/>
						<small>User must be registered in the app</small>
					</div>

					<div class="form-actions">
						<button type="button" class="btn btn-secondary" onclick={closeMemberForm} disabled={farmsLoading}>
							Cancel
						</button>
						<button type="submit" class="btn btn-primary" disabled={farmsLoading || !memberEmail.trim()}>
							{farmsLoading ? 'Adding...' : 'Add Member'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.loading {
		text-align: center;
		color: var(--color-text);
		font-size: 1.2rem;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.farms {
		max-width: 1280px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--color-theme-2);
		margin: 0;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.add-btn {
		background: var(--color-theme-2);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 9999px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
		transition: background 0.2s, transform 0.15s ease, box-shadow 0.2s ease;
	}

	.add-btn:hover:not(:disabled) {
		background: #1a5a8a;
		transform: translateY(-1px);
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
	}

	.add-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		background: #fff5f5;
		color: #9b1c1c;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #fed7d7;
	}

	.saving-message {
		background: #eef6ff;
		color: #0b61a4;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #cfe4ff;
		font-weight: 600;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.farms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.75rem;
	}

	.farm-card {
		background: #ffffff;
		border-radius: 14px;
		padding: 1.25rem 1.25rem 1rem 1.25rem;
		border: 1px solid rgba(0, 0, 0, 0.06);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
		transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.farm-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
		border-color: rgba(0, 0, 0, 0.12);
	}

	.farm-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.farm-header h2 {
		margin: 0;
		color: var(--color-theme-2);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.farm-badge {
		background: #eef2ff;
		color: #4338ca;
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 700;
		border: 1px solid #e0e7ff;
	}

	.farm-badge.owner {
		background: #ecfdf5;
		color: #047857;
		border-color: #a7f3d0;
	}

	.farm-details {
		margin-bottom: 1rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.detail-item .label {
		font-weight: 600;
		color: var(--color-text);
		opacity: 0.8;
	}

	.detail-item .value {
		color: var(--color-theme-2);
		font-weight: 700;
	}

	.farm-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.btn {
		padding: 0.55rem 0.95rem;
		border: none;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s, transform 0.15s ease, box-shadow 0.2s ease, color 0.2s ease;
	}

	.btn-primary {
		background: var(--color-theme-2);
		color: white;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
	}

	.btn-primary:hover:not(:disabled) {
		background: #1a5a8a;
		transform: translateY(-1px);
		box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #111827;
		border: 1px solid #e5e7eb;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.btn-danger {
		background: #d32f2f;
		color: white;
		box-shadow: 0 6px 18px rgba(211, 47, 47, 0.24);
	}

	.btn-danger:hover:not(:disabled) {
		background: #b71c1c;
		transform: translateY(-1px);
		box-shadow: 0 10px 22px rgba(183, 28, 28, 0.28);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.members-list {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	.members-list h3 {
		font-size: 1rem;
		margin: 0 0 0.5rem 0;
		color: var(--color-text);
		opacity: 0.95;
	}

	.members-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.members-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		color: var(--color-text);
	}

	.btn-remove {
		background: transparent;
		color: #b91c1c;
		border: 1px solid #fecaca;
		padding: 0.25rem 0.5rem;
		border-radius: 8px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-remove:hover:not(:disabled) {
		background: #fee2e2;
		color: #7f1d1d;
		border-color: #fca5a5;
	}

	.btn-remove:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(2, 6, 23, 0.55);
		backdrop-filter: saturate(120%) blur(6px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 14px;
		padding: 0;
		max-width: 560px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		border: 1px solid rgba(0, 0, 0, 0.06);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
		animation: scaleIn 160ms ease-out;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h2 {
		margin: 0;
		color: var(--color-theme-2);
		font-weight: 800;
	}

	.close-btn {
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
		transition: background 0.2s, transform 0.15s ease;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.form-group input {
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 10px;
		font-size: 1rem;
		box-sizing: border-box;
		background: #f8fafc;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-theme-2);
		box-shadow: 0 0 0 4px rgba(26, 106, 156, 0.15);
	}

	.form-group input:disabled {
		background-color: #f3f4f6;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.form-group small {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.875rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	.section-divider {
		border: none;
		border-top: 1px solid #e5e7eb;
		margin: 1.25rem 0;
	}

	.muted {
		color: #6b7280;
	}

	.fields-list {
		list-style: none;
		margin: 0 0 1rem 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.fields-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255,255,255,.6);
		border: 1px solid rgba(0,0,0,.06);
		border-radius: 10px;
		padding: 0.5rem 0.75rem;
	}
	.field-name {
		font-weight: 600;
		color: var(--color-text);
	}
	.field-info {
		display: flex;
		align-items: center;
		gap: .5rem;
	}
	.inline-form .form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.edit-field-row {
		display: grid;
		grid-template-columns: 1.2fr .8fr auto;
		align-items: center;
		gap: .5rem;
		width: 100%;
	}
	.row-actions {
		display: flex;
		gap: .5rem;
	}
	.btn-sm {
		padding: 0.35rem 0.7rem;
		border-radius: 8px;
		font-size: .8rem;
	}
	.link-btn {
		background: none;
		border: none;
		color: var(--color-theme-2);
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		font-size: .9rem;
	}
	.link-btn.danger {
		color: #b91c1c;
	}
	@media (max-width: 640px) {
		.inline-form .form-row {
			grid-template-columns: 1fr;
		}
	}
	/* Accessibility and motion preferences */
	:focus-visible {
		outline: 2px solid var(--color-theme-2);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.001ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.001ms !important;
			scroll-behavior: auto !important;
		}
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; }
	}

	@keyframes scaleIn {
		from { transform: scale(0.98); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	@media (max-width: 640px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.farms-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.farm-actions {
			flex-direction: column;
		}

		.farm-actions .btn {
			width: 100%;
		}

		.farms {
			padding: 1.25rem;
		}

		.modal {
			max-width: 100%;
		}
	}
</style>
