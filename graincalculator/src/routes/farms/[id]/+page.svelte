<script>
	import { authStore } from '$lib/stores/authStore.js';
	import { farmStore } from '$lib/stores/farmStore.svelte.js';
	import { fieldStore } from '$lib/stores/fieldStore.svelte.js';
	import { UserService } from '$lib/services/userService.js';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	const { params } = $props();
	import { onMount } from 'svelte';

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

	let farm = $state(null);
	let fields = $state([]);
	let members = $state([]);
	let loading = $state(false);
	let error = $state('');
	let didInitLoad = $state(false);

	// Editing state
	let farmForm = $state({ name: '' });
	let savingFarm = $state(false);

	// Fields editing
	let newField = $state({ name: '', acres: 0 });
	let fieldsLoading = $state(false);
	let editingFieldId = $state(null);
	let editingField = $state({ name: '', acres: 0 });

	// Members editing
	let memberEmail = $state('');
	let membersLoading = $state(false);

	$effect(() => {
		if (user && !loadingAuth && params?.id && !didInitLoad) {
			didInitLoad = true;
			loadDetails(params.id);
		}
	});

	async function loadDetails(farmId) {
		error = '';
		loading = true;
		try {
			farm = await farmStore.getById(farmId);
			if (!farm) {
				error = 'Farm not found or you do not have access.';
				loading = false;
				return;
			}
			farmForm = { name: farm.name || '' };
			fields = await fieldStore.getAll(farmId);
			// resolve member labels
			const ids = new Set([...(farm.memberIds || []), farm.ownerId].filter(Boolean));
			const list = [];
			for (const id of ids) {
				if (id === user.uid) {
					list.push({ id, label: 'You', isOwner: id === farm.ownerId });
				} else {
					const u = await UserService.getById(id);
					const label =
						[u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() ||
						u?.email ||
						id.substring(0, 8) + '...';
					list.push({ id, label, isOwner: id === farm.ownerId });
				}
			}
			members = list;
		} catch (e) {
			error = e?.message || 'Failed to load farm details';
		} finally {
			loading = false;
		}
	}

	function isOwner() {
		return user && farm && farm.ownerId === user.uid;
	}

	async function saveFarm() {
		if (!isOwner()) return;
		if (!farmForm.name.trim()) {
			error = 'Farm name is required';
			return;
		}
		savingFarm = true;
		error = '';
		try {
			await farmStore.update(farm.id, { name: farmForm.name.trim() });
			await loadDetails(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to update farm';
		} finally {
			savingFarm = false;
		}
	}

	// Fields
	function startEditField(f) {
		editingFieldId = f.id;
		editingField = { name: f.name, acres: f.acres };
	}
	function cancelEditField() {
		editingFieldId = null;
		editingField = { name: '', acres: 0 };
	}
	async function saveEditField() {
		if (!isOwner() || !editingFieldId) return;
		if (!editingField.name.trim() || Number(editingField.acres) <= 0) {
			error = 'Please provide a field name and acres';
			return;
		}
		fieldsLoading = true;
		try {
			await fieldStore.update(farm.id, editingFieldId, {
				name: editingField.name.trim(),
				acres: Number(editingField.acres)
			});
			cancelEditField();
			fields = await fieldStore.getAll(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to update field';
		} finally {
			fieldsLoading = false;
		}
	}
	async function createField() {
		if (!isOwner()) return;
		if (!newField.name.trim() || Number(newField.acres) <= 0) {
			error = 'Please provide a field name and acres';
			return;
		}
		fieldsLoading = true;
		try {
			await fieldStore.create(farm.id, {
				name: newField.name.trim(),
				acres: Number(newField.acres)
			});
			newField = { name: '', acres: 0 };
			fields = await fieldStore.getAll(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to create field';
		} finally {
			fieldsLoading = false;
		}
	}
	async function deleteField(fieldId) {
		if (!isOwner() || !fieldId) return;
		if (
			!confirm(
				'Delete this field? This will not remove existing calculations, but they may be orphaned.'
			)
		)
			return;
		fieldsLoading = true;
		try {
			await fieldStore.remove(farm.id, fieldId);
			if (editingFieldId === fieldId) cancelEditField();
			fields = await fieldStore.getAll(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to delete field';
		} finally {
			fieldsLoading = false;
		}
	}

	// Members
	async function addMember() {
		if (!isOwner()) return;
		if (!memberEmail.trim()) {
			error = 'Email is required';
			return;
		}
		membersLoading = true;
		error = '';
		try {
			const userToAdd = await UserService.findByEmail(memberEmail.trim());
			if (!userToAdd) {
				error =
					'User with this email not found. Please make sure they have registered for the app.';
				membersLoading = false;
				return;
			}
			await farmStore.addMember(farm.id, userToAdd.id);
			memberEmail = '';
			await loadDetails(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to add member';
		} finally {
			membersLoading = false;
		}
	}
	async function removeMember(memberUserId) {
		if (!isOwner() || !memberUserId || memberUserId === farm.ownerId) return;
		if (!confirm('Are you sure you want to remove this member from the farm?')) return;
		membersLoading = true;
		error = '';
		try {
			await farmStore.removeMember(farm.id, memberUserId);
			await loadDetails(farm.id);
		} catch (e) {
			error = e?.message || 'Failed to remove member';
		} finally {
			membersLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Farm Details</title>
	<meta name="description" content="View farm details, fields and members" />
</svelte:head>

{#if loadingAuth || loading}
	<div class="loading-container">
		<div class="loading">Loading farm...</div>
	</div>
{:else if error}
	<div class="error-message">{error}</div>
{:else if farm}
	<section class="farm-detail">
		<header class="header">
			<h1>Farm: {farm.name}</h1>
		</header>

		<div class="grid">
			<div class="card-block">
				<h2>Basic Info</h2>
				<div class="form-group">
					<label for="farm-name">Farm Name</label>
					<input
						id="farm-name"
						type="text"
						bind:value={farmForm.name}
						disabled={!isOwner() || savingFarm}
					/>
				</div>
				{#if isOwner()}
					<button
						class="btn btn-primary"
						onclick={saveFarm}
						disabled={savingFarm || !farmForm.name.trim()}
					>
						{savingFarm ? 'Saving...' : 'Save'}
					</button>
				{/if}
			</div>

			<div class="card-block">
				<h2>Members</h2>
				<ul class="members">
					{#each members as m (m.id)}
						<li>
							<span>{m.isOwner ? '👑 ' : ''}{m.label}</span>
							{#if isOwner() && !m.isOwner}
								<button
									class="link-btn danger"
									onclick={() => removeMember(m.id)}
									disabled={membersLoading}>Remove</button
								>
							{/if}
						</li>
					{/each}
				</ul>
				{#if isOwner()}
					<div class="inline-form">
						<div class="form-group">
							<label for="member-email">Add member by email</label>
							<input
								id="member-email"
								type="email"
								bind:value={memberEmail}
								placeholder="user@example.com"
								disabled={membersLoading}
							/>
						</div>
						<button
							class="btn btn-primary"
							onclick={addMember}
							disabled={membersLoading || !memberEmail.trim()}
						>
							{membersLoading ? 'Adding...' : 'Add Member'}
						</button>
					</div>
				{/if}
			</div>

			<div class="card-block">
				<h2>Fields</h2>
				{#if fields.length === 0}
					<p class="muted">No fields yet.</p>
				{:else}
					<ul class="fields">
						{#each fields as f (f.id)}
							<li>
								{#if editingFieldId === f.id}
									<div class="edit-field-row">
										<input
											type="text"
											bind:value={editingField.name}
											placeholder="Field name"
											disabled={fieldsLoading}
										/>
										<input
											type="number"
											step="0.01"
											min="0"
											bind:value={editingField.acres}
											placeholder="Acres"
											disabled={fieldsLoading}
										/>
										<div class="row-actions">
											<button
												class="btn btn-primary btn-sm"
												onclick={saveEditField}
												disabled={fieldsLoading}>Save</button
											>
											<button
												class="btn btn-secondary btn-sm"
												onclick={cancelEditField}
												disabled={fieldsLoading}>Cancel</button
											>
										</div>
									</div>
								{:else}
									<div class="left">
										<a href={resolve(`/farms/${params.id}/fields/${f.id}`)} class="field-link">
											<strong>{f.name}</strong>
										</a>
										<span class="chip">{f.acres} acres</span>
									</div>
									{#if isOwner()}
										<div class="row-actions">
											<button
												class="link-btn"
												onclick={() => startEditField(f)}
												disabled={fieldsLoading}>Edit</button
											>
											<button
												class="link-btn danger"
												onclick={() => deleteField(f.id)}
												disabled={fieldsLoading}>Delete</button
											>
										</div>
									{/if}
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if isOwner()}
					<form
						class="inline-form"
						onsubmit={(e) => {
							e.preventDefault();
							createField();
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
									disabled={fieldsLoading}
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
									disabled={fieldsLoading}
								/>
							</div>
						</div>
						<div class="form-actions">
							<button
								type="submit"
								class="btn btn-primary"
								disabled={fieldsLoading || !newField.name.trim() || Number(newField.acres) <= 0}
							>
								{fieldsLoading ? 'Creating...' : 'Add Field'}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
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
	.farm-detail {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
	}
	.header h1 {
		margin: 0 0 1rem 0;
		color: var(--color-theme-2);
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	.card-block {
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 14px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
		padding: 1.25rem;
	}
	h2 {
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}
	.members,
	.fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.fields .left {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.inline-form .form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.form-group input {
		padding: 0.75rem;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 10px;
		font-size: 1rem;
		background: #f8fafc;
	}
	.form-actions,
	.row-actions {
		display: flex;
		gap: 0.5rem;
	}
	.btn {
		padding: 0.55rem 0.95rem;
		border: none;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}
	.btn-primary {
		background: var(--color-theme-2);
		color: white;
	}
	.btn-secondary {
		background: #f3f4f6;
		color: #111827;
		border: 1px solid #e5e7eb;
	}
	.btn-sm {
		padding: 0.35rem 0.7rem;
		border-radius: 8px;
		font-size: 0.8rem;
	}
	.link-btn {
		background: none;
		border: none;
		color: var(--color-theme-2);
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		font-size: 0.9rem;
	}
	.link-btn.danger {
		color: #b91c1c;
	}
	.muted {
		color: #6b7280;
	}
	@media (max-width: 800px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
