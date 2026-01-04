<script>
	import { authStore } from '$lib/stores/authStore.js';
	import { userStore } from '$lib/stores/userStore.svelte.js';
	import ProfileImageUpload from '$lib/components/ProfileImageUpload.svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let authState = $state(get(authStore));

	$effect(() => {
		const unsub = authStore.subscribe((s) => {
			authState = s;
			if (browser && !s.loading && !s.user) {
				goto(resolve('/login'));
			}
		});
		return unsub;
	});

	let user = $derived(authState.user);
	let loadingAuth = $derived(authState.loading);

	let profile = $state(null);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	let form = $state({
		firstName: '',
		lastName: '',
		email: '',
		userId: '',
		photoURL: ''
	});

	// Load profile when authenticated
	$effect(() => {
		if (user && !loadingAuth) {
			loadProfile();
		}
	});

	async function loadProfile() {
		error = '';
		success = '';
		try {
			const data = await userStore.load(user.uid);
			profile = data;
			form = {
				firstName: data?.firstName || '',
				lastName: data?.lastName || '',
				email: data?.email || user.email || '',
				userId: data?.userId || user.uid,
				photoURL: data?.photoURL || ''
			};
		} catch (e) {
			error = e?.message || 'Failed to load profile';
		}
	}

	async function saveProfile() {
		error = '';
		success = '';
		if (!user?.uid) return;
		saving = true;
		try {
			const updated = await userStore.update(user.uid, {
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				photoURL: form.photoURL || undefined
			});
			profile = updated;
			success = 'Profile saved';
		} catch (e) {
			error = e?.message || 'Failed to save profile';
		} finally {
			saving = false;
		}
	}

	function onUploaded(e) {
		const url = e.detail?.url;
		if (url) {
			form.photoURL = url;
			success = 'Profile photo updated';
		}
	}
</script>

<svelte:head>
	<title>My Profile - Ag Tools</title>
	<meta name="description" content="Manage your user profile" />
</svelte:head>

{#if loadingAuth}
	<div class="loading-container">
		<div class="loading">Loading profile...</div>
	</div>
{:else if user}
<section class="profile">
	<div class="header">
		<h1>My Profile</h1>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}
	{#if success}
		<div class="success-message">{success}</div>
	{/if}

	<div class="card">
		<div class="left">
			<div class="avatar-block">
				<h2>Profile Photo</h2>
				<ProfileImageUpload userId={user?.uid} initialUrl={form.photoURL} on:uploaded={onUploaded} />
			</div>
		</div>
		<div class="right">
			<h2>Account</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					saveProfile();
				}}
				aria-busy={saving}
			>
				<div class="grid">
					<div class="form-group">
						<label for="firstName">First name</label>
						<input
							id="firstName"
							type="text"
							bind:value={form.firstName}
							placeholder="First name"
							autocomplete="given-name"
							disabled={saving}
						/>
					</div>
					<div class="form-group">
						<label for="lastName">Last name</label>
						<input
							id="lastName"
							type="text"
							bind:value={form.lastName}
							placeholder="Last name"
							autocomplete="family-name"
							disabled={saving}
						/>
					</div>
				</div>

				<div class="display-field">
					<label>Email</label>
					<div class="value" role="text" aria-label="Email">{form.email}</div>
					<small>Contact support to change your account email</small>
				</div>

				<div class="display-field">
					<label>User ID</label>
					<div class="value" role="text" aria-label="User ID">{form.userId}</div>
					<small>This is your unique user ID and cannot be changed.</small>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						{saving ? 'Saving...' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
</section>
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
	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; }
	}

	.profile {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}
	h1 {
		color: var(--color-theme-2);
		margin: 0;
		font-weight: 800;
	}
	.error-message {
		background: #fff5f5;
		color: #9b1c1c;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #fed7d7;
	}
	.success-message {
		background: #ecfdf5;
		color: #065f46;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #a7f3d0;
	}
	.card {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 2rem;
		background: #ffffff;
		border-radius: 14px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
		padding: 1.25rem;
	}
	.left, .right {
		min-width: 0;
	}
	.avatar-block h2, .right h2 {
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}
	form {
		margin-top: 0.5rem;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.form-group {
		margin-bottom: 1rem;
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
	.form-group input[readonly] {
		background: #f3f4f6;
	}
	.form-group small {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.875rem;
	}
	.display-field {
		margin-bottom: 1rem;
	}
	.display-field label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.display-field .value {
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 10px;
		background: #f3f4f6;
		color: #111827;
		word-break: break-all;
	}
	.display-field small {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.875rem;
	}
	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.25rem;
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
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 800px) {
		.card {
			grid-template-columns: 1fr;
			padding: 1rem;
		}
		.grid {
			grid-template-columns: 1fr;
		}
		.avatar-block {
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
		.form-actions {
			justify-content: stretch;
		}
		.form-actions .btn {
			width: 100%;
		}
	}
</style>
