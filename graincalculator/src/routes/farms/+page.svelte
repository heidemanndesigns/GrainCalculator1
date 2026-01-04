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

	let memberEmail = $state('');

	// Load farms when user is available
	$effect(() => {
		if (user && !loading) {
			loadFarms();
		}
	});

	async function loadFarms() {
		if (!user) return;
		farmsLoading = true;
		try {
			farms = await farmStore.getAll();
		} catch (err) {
			console.error('Error loading farms:', err);
			error = 'Failed to load farms';
		} finally {
			farmsLoading = false;
		}
	}

	function openFarmForm(farm) {
		if (farm) {
			editingFarmId = farm.id;
			farmFormData = {
				name: farm.name
			};
		} else {
			editingFarmId = null;
			farmFormData = {
				name: ''
			};
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
		if (!farmFormData.name.trim()) {
			error = 'Farm name is required';
			return;
		}

		farmsLoading = true;
		error = '';
		try {
			if (editingFarmId) {
				await farmStore.update(editingFarmId, { name: farmFormData.name.trim() });
			} else {
				await farmStore.create({ name: farmFormData.name.trim() });
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
								{#each farm.memberIds as memberId}
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
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closeFarmForm();
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

				<form
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
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') closeMemberForm();
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
	}

	.farms {
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
		background: var(--color-theme-2);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.add-btn:hover:not(:disabled) {
		background: #1a5a8a;
	}

	.add-btn:disabled {
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

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.farms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.farm-card {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
		font-size: 1.5rem;
	}

	.farm-badge {
		background: #e0e0e0;
		color: var(--color-text);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.farm-badge.owner {
		background: #ffd700;
		color: #333;
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
	}

	.detail-item .value {
		color: var(--color-theme-2);
		font-weight: 600;
	}

	.farm-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-primary {
		background: var(--color-theme-2);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1a5a8a;
	}

	.btn-secondary {
		background: #e0e0e0;
		color: var(--color-text);
	}

	.btn-secondary:hover:not(:disabled) {
		background: #d0d0d0;
	}

	.btn-danger {
		background: #d32f2f;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b71c1c;
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
		color: #d32f2f;
		border: 1px solid #d32f2f;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-remove:hover:not(:disabled) {
		background: #d32f2f;
		color: white;
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
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 8px;
		padding: 0;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(0, 0, 0, 0.1);
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

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--color-theme-2);
	}

	.form-group input:disabled {
		background-color: #e0e0e0;
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

	@media (max-width: 640px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.farms-grid {
			grid-template-columns: 1fr;
		}

		.farm-actions {
			flex-direction: column;
		}

		.farm-actions .btn {
			width: 100%;
		}
	}
</style>

