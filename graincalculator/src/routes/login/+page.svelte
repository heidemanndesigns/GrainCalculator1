<script>
	import { authStore, authHandlers } from '$lib/stores/authStore.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { get } from 'svelte/store';

	let authState = $state(get(authStore));
	
	// Subscribe to auth store changes
	$effect(() => {
		const unsubscribe = authStore.subscribe((state) => {
			authState = state;
		});
		return unsubscribe;
	});

	let user = $derived(authState.user);
	let loading = $derived(authState.loading);
	let error = $derived(authState.error);

	// Form state
	let email = $state('');
	let password = $state('');
	let isSignUp = $state(false);
	let formLoading = $state(false);

	async function handleSubmit() {
		if (!email || !password) {
			return;
		}

		formLoading = true;
		try {
			if (isSignUp) {
				await authHandlers.signUp(email, password);
			} else {
				await authHandlers.signIn(email, password);
			}
			// Redirect to home page after successful login/signup
			goto(resolve('/'));
		} catch (err) {
			// Error is already handled in authStore
			console.error('Auth error:', err);
		} finally {
			formLoading = false;
		}
	}

	async function handleSignOut() {
		try {
			await authHandlers.signOut();
		} catch (err) {
			// Error is already handled in authStore
			console.error('Sign out error:', err);
		}
	}

	function toggleMode() {
		isSignUp = !isSignUp;
		error = null;
	}
</script>

<svelte:head>
	<title>Login - Ag Tools Suite</title>
	<meta name="description" content="Sign in to access your agriculture management tools" />
</svelte:head>

<section class="login">
	<div class="login-card">
		{#if loading}
			<div class="loading">Loading...</div>
		{:else if user}
			<div class="user-info">
				<h1>Welcome back!</h1>
				<div class="user-details">
					{#if user.photoURL}
						<img src={user.photoURL} alt={user.displayName || 'User'} class="avatar" />
					{/if}
					<div class="user-text">
						<p class="name">{user.displayName || user.email}</p>
						<p class="email">{user.email}</p>
					</div>
				</div>
				<button class="btn btn-secondary" on:click={handleSignOut} disabled={loading}>
					Sign Out
				</button>
				<a href={resolve('/')} class="btn btn-primary">Go to Dashboard</a>
			</div>
		{:else}
			<div class="sign-in">
				<h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
				<p class="subtitle">
					{isSignUp 
						? 'Create an account to access your agriculture management tools'
						: 'Sign in to access your agriculture management tools'}
				</p>
				{#if error}
					<div class="error-message">{error}</div>
				{/if}
				<form on:submit|preventDefault={handleSubmit}>
					<div class="form-group">
						<label for="email">Email</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							placeholder="Enter your email"
							required
							disabled={formLoading || loading}
							autocomplete="email"
						/>
					</div>
					<div class="form-group">
						<label for="password">Password</label>
						<input
							type="password"
							id="password"
							bind:value={password}
							placeholder="Enter your password"
							required
							disabled={formLoading || loading}
							autocomplete={isSignUp ? 'new-password' : 'current-password'}
							minlength="6"
						/>
					</div>
					<button 
						type="submit" 
						class="btn btn-primary" 
						disabled={formLoading || loading || !email || !password}
					>
						{formLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
					</button>
				</form>
				<div class="toggle-mode">
					<p>
						{isSignUp ? 'Already have an account?' : "Don't have an account?"}
						<button 
							type="button" 
							class="link-btn" 
							on:click={toggleMode}
							disabled={formLoading || loading}
						>
							{isSignUp ? 'Sign In' : 'Sign Up'}
						</button>
					</p>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.login {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.login-card {
		background: rgba(255, 255, 255, 0.9);
		border-radius: 12px;
		padding: 3rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		color: var(--color-theme-2);
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		text-align: center;
	}

	.subtitle {
		color: var(--color-text);
		opacity: 0.8;
		text-align: center;
		margin: 0 0 2rem 0;
	}

	.loading {
		text-align: center;
		color: var(--color-text);
		padding: 2rem;
	}

	.user-info {
		text-align: center;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 2rem 0;
		gap: 1rem;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 3px solid var(--color-theme-1);
	}

	.user-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.name {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-theme-2);
		margin: 0;
	}

	.email {
		font-size: 0.9rem;
		color: var(--color-text);
		opacity: 0.7;
		margin: 0;
	}

	.sign-in {
		display: flex;
		flex-direction: column;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text);
	}

	input {
		padding: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	input:focus {
		outline: none;
		border-color: var(--color-theme-1);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: #f5f5f5;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.toggle-mode {
		margin-top: 1.5rem;
		text-align: center;
	}

	.toggle-mode p {
		color: var(--color-text);
		font-size: 0.9rem;
		margin: 0;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-theme-1);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		margin-left: 0.25rem;
		font-size: inherit;
		font-family: inherit;
	}

	.link-btn:hover:not(:disabled) {
		color: var(--color-theme-2);
	}

	.link-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn {
		width: 100%;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		text-decoration: none;
		margin-top: 0.5rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-theme-1);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-theme-2);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-text);
		border: 2px solid var(--color-theme-1);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-theme-1);
		color: white;
	}

	@media (max-width: 640px) {
		.login-card {
			padding: 2rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>

