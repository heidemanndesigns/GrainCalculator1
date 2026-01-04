<script>
	import { createEventDispatcher } from 'svelte';
	import { userStore } from '$lib/stores/userStore.svelte.js';

	export let userId = '';
	export let initialUrl = '';

	const dispatch = createEventDispatcher();

	let file = null;
	let previewUrl = initialUrl || '';
	let uploading = false;
	let progress = 0;
	let error = '';

	function onFileChange(e) {
		error = '';
		const f = e.target.files?.[0];
		file = f || null;
		if (file) {
			previewUrl = URL.createObjectURL(file);
		}
	}

	async function upload() {
		if (!file) {
			error = 'Please select an image';
			return;
		}
		uploading = true;
		progress = 0;
		error = '';
		try {
			const result = await userStore.uploadPhoto(file, userId, (p) => (progress = p));
			previewUrl = result.url;
			dispatch('uploaded', { url: result.url, profile: result.profile });
		} catch (e) {
			error = e?.message || 'Upload failed';
		} finally {
			uploading = false;
		}
	}
</script>

<div class="avatar-uploader">
	<div class="preview">
		{#if previewUrl}
			<img src={previewUrl} alt="Profile preview" />
		{:else}
			<div class="placeholder">No image</div>
		{/if}
	</div>
	<div class="controls">
		<input
			id="avatar-input"
			type="file"
			accept="image/*"
			on:change={onFileChange}
			aria-label="Choose profile image"
		/>
	</div>
	<button class="btn btn-primary upload-btn" type="button" on:click={upload} disabled={uploading || !file}>
		{uploading ? `Uploading ${progress}%` : 'Upload'}
	</button>
	{#if error}
		<div class="error">{error}</div>
	{/if}
	{#if uploading}
		<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
			<div class="bar" style={`width:${progress}%`} />
		</div>
	{/if}
</div>

<style>
	.avatar-uploader {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		align-items: start;
		justify-items: center;
		max-width: 280px;
	}
	.preview {
		width: 80px;
		height: 80px;
		border-radius: 9999px;
		overflow: hidden;
		background: #f3f4f6;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #e5e7eb;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.placeholder {
		color: #6b7280;
		font-size: 0.75rem;
	}
	.controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		justify-content: center;
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
	.upload-btn {
		width: 100%;
	}
	.error {
		grid-column: 1 / -1;
		color: #b91c1c;
		font-size: 0.85rem;
	}
	.progress {
		width: 100%;
		height: 6px;
		background: #e5e7eb;
		border-radius: 9999px;
		overflow: hidden;
	}
	.progress .bar {
		height: 100%;
		background: var(--color-theme-2);
	}
</style>
