import { UserService } from '../services/userService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';
import { storage } from '$lib/firebase/firebase.client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function createUserStore() {
	let profile = $state(null);
	let loading = $state(false);
	let error = $state(null);

	function getUserId() {
		const auth = get(authStore);
		return auth?.user?.uid || null;
	}

	async function load(userId) {
		const id = userId || getUserId();
		if (!id) {
			profile = null;
			return null;
		}
		loading = true;
		error = null;
		try {
			const data = await UserService.getById(id);
			profile = data;
			return data;
		} catch (e) {
			error = e?.message || 'Failed to load user profile';
			throw e;
		} finally {
			loading = false;
		}
	}

	async function ensureProfileFromAuth(authUser) {
		if (!authUser?.uid || !authUser?.email) return null;
		loading = true;
		error = null;
		try {
			// Ensure at least the doc with email exists
			const base = await UserService.createOrUpdate(authUser.uid, authUser.email, {
				firstName: authUser.displayName ? authUser.displayName.split(' ')[0] : undefined,
				lastName: authUser.displayName ? authUser.displayName.split(' ').slice(1).join(' ') : undefined,
				photoURL: authUser.photoURL || undefined,
				userId: authUser.uid
			});
			profile = base;
			return base;
		} catch (e) {
			error = e?.message || 'Failed to ensure user profile';
			throw e;
		} finally {
			loading = false;
		}
	}

	async function update(userId, data) {
		const id = userId || getUserId();
		if (!id) throw new Error('No userId for update');
		loading = true;
		error = null;
		try {
			const updated = await UserService.update(id, data);
			profile = updated;
			return updated;
		} catch (e) {
			error = e?.message || 'Failed to update user profile';
			throw e;
		} finally {
			loading = false;
		}
	}

	async function uploadPhoto(file, userId, onProgress) {
		const id = userId || getUserId();
		if (!id) throw new Error('No userId for photo upload');
		if (!file) throw new Error('No file selected');
		const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
		const path = `users/${id}/profile_${Date.now()}.${ext}`;
		const storageRef = ref(storage, path);

		return new Promise((resolve, reject) => {
			const task = uploadBytesResumable(storageRef, file);
			task.on(
				'state_changed',
				(snapshot) => {
					if (onProgress) {
						const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
						onProgress(pct);
					}
				},
				(err) => {
					reject(err);
				},
				async () => {
					const url = await getDownloadURL(task.snapshot.ref);
					const updated = await update(id, { photoURL: url });
					resolve({ url, profile: updated });
				}
			);
		});
	}

	return {
		get profile() {
			return profile;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		load,
		ensureProfileFromAuth,
		update,
		uploadPhoto
	};
}

export const userStore = createUserStore();
