<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { authStore, authHandlers } from '$lib/stores/authStore.js';
	import { goto } from '$app/navigation';
	import logo from '$lib/images/svelte-logo.svg';
	import github from '$lib/images/github.svg';

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

	async function handleSignOut() {
		try {
			await authHandlers.signOut();
			goto(resolve('/'));
		} catch (err) {
			console.error('Sign out error:', err);
		}
	}
</script>

<header>
	<div class="corner">
		<a href="https://svelte.dev/docs/kit">
			<img src={logo} alt="SvelteKit" />
		</a>
	</div>

	<nav>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
		</svg>
		<ul>
			<li aria-current={page.url.pathname === '/' ? 'page' : undefined}>
				<a href={resolve('/')}>Home</a>
			</li>
			<li aria-current={page.url.pathname.startsWith('/farms') ? 'page' : undefined}>
				<a href={resolve('/farms')}>Farms</a>
			</li>
			<li aria-current={page.url.pathname.startsWith('/grain-calculator') ? 'page' : undefined}>
				<a href={resolve('/grain-calculator')}>Grain Calculator</a>
			</li>
			<!-- <li aria-current={page.url.pathname.startsWith('/asset-tracker') ? 'page' : undefined}>
				<a href={resolve('/asset-tracker')}>Asset Tracker</a>
			</li>
			<li aria-current={page.url.pathname.startsWith('/soil-moisture') ? 'page' : undefined}>
				<a href={resolve('/soil-moisture')}>Soil Moisture</a>
			</li> -->
		</ul>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
		</svg>
	</nav>

	<div class="corner">
		{#if !loading}
			{#if user}
				<div class="user-menu">
					<a href={resolve('/profile')} class="profile-link" aria-label="Open profile">
						{#if user.photoURL}
							<img src={user.photoURL} alt={user.displayName || 'User'} class="user-avatar" />
						{:else}
							<div class="user-avatar-placeholder">
								{user.displayName?.[0] || user.email?.[0] || 'U'}
							</div>
						{/if}
					</a>
					<div class="user-dropdown">
						<div class="user-info">
							<p class="user-name">{user.displayName || 'User'}</p>
							<p class="user-email">{user.email}</p>
						</div>
						<a href={resolve('/profile')} class="profile-btn">Profile</a>
						<button class="sign-out-btn" on:click={handleSignOut}>Sign Out</button>
					</div>
				</div>
			{:else}
				<a href={resolve('/login')} class="login-link">Sign In</a>
			{/if}
		{/if}
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
	}

	.corner {
		width: 3em;
		height: 3em;
	}

	.corner a {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.corner img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}

	.user-menu {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.user-avatar,
	.user-avatar-placeholder {
		width: 2em;
		height: 2em;
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.profile-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.user-avatar {
		object-fit: cover;
		border: 2px solid var(--color-theme-1);
	}

	.user-avatar-placeholder {
		background: var(--color-theme-1);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 0.9em;
	}

	.user-menu:hover .user-avatar,
	.user-menu:hover .user-avatar-placeholder {
		transform: scale(1.1);
	}

	.user-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: 1rem;
		min-width: 200px;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-10px);
		transition: all 0.2s;
		margin-top: 0.5rem;
		z-index: 1000;
	}

	.user-menu:hover .user-dropdown {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}

	.user-info {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.profile-btn {
		display: block;
		margin-bottom: 0.5rem;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-theme-2);
	}

	.user-name {
		font-weight: 600;
		color: var(--color-theme-2);
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
	}

	.user-email {
		font-size: 0.8rem;
		color: var(--color-text);
		opacity: 0.7;
		margin: 0;
	}

	.sign-out-btn {
		width: 100%;
		padding: 0.5rem;
		background: var(--color-theme-1);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.sign-out-btn:hover {
		background: var(--color-theme-2);
	}

	.login-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: color 0.2s linear;
	}

	.login-link:hover {
		color: var(--color-theme-1);
	}

	nav {
		display: flex;
		justify-content: center;
		--background: rgba(255, 255, 255, 0.7);
	}

	svg {
		width: 2em;
		height: 3em;
		display: block;
	}

	path {
		fill: var(--background);
	}

	ul {
		position: relative;
		padding: 0;
		margin: 0;
		height: 3em;
		display: flex;
		justify-content: center;
		align-items: center;
		list-style: none;
		background: var(--background);
		background-size: contain;
	}

	li {
		position: relative;
		height: 100%;
	}

	li[aria-current='page']::before {
		--size: 6px;
		content: '';
		width: 0;
		height: 0;
		position: absolute;
		top: 0;
		left: calc(50% - var(--size));
		border: var(--size) solid transparent;
		border-top: var(--size) solid var(--color-theme-1);
	}

	nav a {
		display: flex;
		height: 100%;
		align-items: center;
		padding: 0 0.5rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: color 0.2s linear;
	}

	a:hover {
		color: var(--color-theme-1);
	}
</style>
