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

	let farm = $state(null);
	let fields = $state([]);
	let members = $state([]);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (user && !loadingAuth && params?.id) {
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
			fields = await fieldStore.getAll(farmId);
			// resolve member labels
			const ids = new Set([...(farm.memberIds || []), farm.ownerId].filter(Boolean));
			const list = [];
			for (const id of ids) {
				if (id === user.uid) {
					list.push({ id, label: 'You', isOwner: id === farm.ownerId });
				} else {
					const u = await UserService.getById(id);
					const label = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || id.substring(0, 8) + '...';
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
		<h1>{farm.name}</h1>
	</header>

	<div class="grid">
		<div class="card-block">
			<h2>Members</h2>
			<ul class="members">
				{#each members as m}
					<li>
						<span>{m.isOwner ? '👑 ' : ''}{m.label}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="card-block">
			<h2>Fields</h2>
			{#if fields.length === 0}
				<p class="muted">No fields yet.</p>
			{:else}
				<ul class="fields">
					{#each fields as f}
						<li>
							<div class="left">
								<strong>{f.name}</strong>
								<span class="chip">{f.acres} acres</span>
							</div>
						</li>
					{/each}
				</ul>
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
		border: 1px solid rgba(0,0,0,0.06);
		border-radius: 14px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.08);
		padding: 1.25rem;
	}
	h2 {
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}
	.members, .fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: .5rem;
	}
	.fields .left {
		display: flex;
		gap: .5rem;
		align-items: center;
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
