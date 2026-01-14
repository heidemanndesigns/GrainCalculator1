import { FarmService } from '../services/farmService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';
import { db } from '$lib/firebase/firebase.client';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

/**
 * Farm store - reactive state management for farms
 * Uses Svelte 5 runes ($state)
 * Integrates with Firebase and requires user authentication
 */
export function createFarmStore() {
	let farms = $state([]);
	let initialized = $state(false);
	let loading = $state(false);
	let currentUserId = $state(null);
	// Realtime listeners
	let memberUnsub = null;
	let ownerUnsub = null;
	let memberInitDone = false;
	let ownerInitDone = false;
	/** @type {Map<string, any>} */
	let memberFarmsMap = new SvelteMap();
	/** @type {Map<string, any>} */
	let ownerFarmsMap = new SvelteMap();
	// Simple subscription API for external consumers
	/** @type {Set<(f:any[])=>void>} */
	const subscribers = new SvelteSet();
	function notify() {
		for (const fn of subscribers) {
			try { fn(farms); } catch { /* noop */ }
		}
	}

	function resetRealtime() {
		if (memberUnsub) {
			try { memberUnsub(); } catch { /* noop */ }
			memberUnsub = null;
		}
		if (ownerUnsub) {
			try { ownerUnsub(); } catch { /* noop */ }
			ownerUnsub = null;
		}
		memberFarmsMap = new SvelteMap();
		ownerFarmsMap = new SvelteMap();
		memberInitDone = false;
		ownerInitDone = false;
	}

	function normalizeDoc(doc) {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
			updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
		};
	}

	function sortFarms(list) {
		return [...list].sort((a, b) => {
			const an = (a?.name ?? '').toString();
			const bn = (b?.name ?? '').toString();
			const byName = an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
			if (byName !== 0) return byName;
			// fallback: by createdAt then id for stability
			const ac = (a?.createdAt ?? '').toString();
			const bc = (b?.createdAt ?? '').toString();
			const byCreated = ac.localeCompare(bc);
			if (byCreated !== 0) return byCreated;
			return (a?.id ?? '').localeCompare(b?.id ?? '');
		});
	}

	function publishMerged() {
		// Merge owner + member maps (owner wins for duplicates but they should be identical)
		const merged = new SvelteMap([...memberFarmsMap, ...ownerFarmsMap]);
		farms = sortFarms(Array.from(merged.values()));
		notify();
	}

	function finalizeIfReady() {
		// If both listeners have either delivered or failed to attach,
		// mark initialization complete and stop loading to avoid UI hang.
		if (memberInitDone && ownerInitDone) {
			publishMerged();
			initialized = true;
			loading = false;
		}
	}

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 */
	async function init(userId) {
		if (!userId) {
			resetRealtime();
			farms = [];
			initialized = false;
			currentUserId = null;
			return;
		}

		if (initialized && currentUserId === userId) return;

		loading = true;
		try {
			// Set up realtime listeners (member and owner)
			resetRealtime();
			currentUserId = userId;
			// Clear stale farms so UI doesn't show previous user's data
			farms = [];
			notify();

			const farmsRef = collection(db, 'Farms');

			// Listen to farms where the user is a member
			try {
				const qMembers = query(farmsRef, where('memberIds', 'array-contains', userId));
				memberUnsub = onSnapshot(qMembers, (snapshot) => {
					memberFarmsMap.clear();
					for (const d of snapshot.docs) {
						memberFarmsMap.set(d.id, normalizeDoc(d));
					}
					memberInitDone = true;
					publishMerged();
					if (memberInitDone && ownerInitDone) {
						initialized = true;
						loading = false;
					}
				}, (err) => {
					console.warn('[farmStore] memberIds listener error', err);
					memberInitDone = true;
					if (memberInitDone && ownerInitDone) {
						initialized = true;
						loading = false;
					}
				});
			} catch (e) {
				console.warn('[farmStore] failed to attach member listener', e);
				memberInitDone = true;
				finalizeIfReady();
			}

			// Listen to farms where the user is the owner
			try {
				const qOwner = query(farmsRef, where('ownerId', '==', userId));
				ownerUnsub = onSnapshot(qOwner, (snapshot) => {
					ownerFarmsMap.clear();
					for (const d of snapshot.docs) {
						ownerFarmsMap.set(d.id, normalizeDoc(d));
					}
					ownerInitDone = true;
					publishMerged();
					if (memberInitDone && ownerInitDone) {
						initialized = true;
						loading = false;
					}
				}, (err) => {
					console.warn('[farmStore] ownerId listener error', err);
					ownerInitDone = true;
					if (memberInitDone && ownerInitDone) {
						initialized = true;
						loading = false;
					}
				});
			} catch (e) {
				console.warn('[farmStore] failed to attach owner listener', e);
				ownerInitDone = true;
				finalizeIfReady();
			}
		} catch (error) {
			console.error('Error initializing farm store:', error);
			farms = [];
		} finally {
			// loading is turned off when both listeners deliver first result
			finalizeIfReady();
		}
	}

	/**
	 * Get current user ID from auth store
	 */
	function getUserId() {
		const auth = get(authStore);
		return auth?.user?.uid || null;
	}

	/**
	 * Get all farms
	 */
	async function getAll() {
		const userId = getUserId();
		if (!userId) {
			console.log('[farmStore.getAll] no userId');
			farms = [];
			return farms;
		}
		console.log('[farmStore.getAll] init for user', userId);
		await init(userId);
		console.log('[farmStore.getAll] returning farms', { count: farms?.length });
		return farms;
	}

	/**
	 * Get farms owned by current user
	 */
	async function getOwnedFarms() {
		const userId = getUserId();
		if (!userId) {
			return [];
		}
		await init(userId);
		return farms.filter(farm => farm.ownerId === userId);
	}

	/**
	 * Get farm by ID
	 */
	async function getById(id) {
		const userId = getUserId();
		if (!userId || !id) return null;

		await init(userId);
		const farm = farms.find((farm) => farm.id === id);
		if (farm) return farm;

		// If not in local state, fetch from Firestore
		return await FarmService.getById(userId, id);
	}

	/**
	 * Create a new farm
	 */
	async function create(farmData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to create a farm');
		}

		loading = true;
		try {
			console.log('[farmStore.create] start', { userId, farmData });
			const saved = await FarmService.create(userId, farmData);
			// Realtime listeners will update 'farms' automatically
			console.log('[farmStore.create] saved and refreshed', { savedId: saved?.id });
			return saved;
		} catch (error) {
			console.error('Error creating farm:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Update farm
	 */
	async function update(id, farmData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to update a farm');
		}

		loading = true;
		try {
			console.log('[farmStore.update] start', { userId, id, farmData });
			const updated = await FarmService.update(userId, id, farmData);
			// Realtime listeners will update 'farms' automatically
			console.log('[farmStore.update] updated and refreshed', { id });
			return updated;
		} catch (error) {
			console.error('Error updating farm:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete farm
	 */
	async function remove(id) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete a farm');
		}

		loading = true;
		try {
			await FarmService.delete(userId, id);
			// Realtime listeners will update 'farms' automatically
		} catch (error) {
			console.error('Error deleting farm:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Add member to farm
	 */
	async function addMember(farmId, memberUserId) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to add members');
		}

		loading = true;
		try {
			const updated = await FarmService.addMember(userId, farmId, memberUserId);
			// Realtime listeners will update 'farms' automatically
			return updated;
		} catch (error) {
			console.error('Error adding member to farm:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Remove member from farm
	 */
	async function removeMember(farmId, memberUserId) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to remove members');
		}

		loading = true;
		try {
			const updated = await FarmService.removeMember(userId, farmId, memberUserId);
			// Realtime listeners will update 'farms' automatically
			return updated;
		} catch (error) {
			console.error('Error removing member from farm:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	return {
		get all() {
			const userId = getUserId();
			if (!userId) return [];
			if (!initialized || currentUserId !== userId) {
				// Trigger async load
				init(userId);
			}
			return farms;
		},
		get loading() {
			return loading;
		},
		subscribe: (fn) => {
			subscribers.add(fn);
			try { fn(farms); } catch { /* noop */ }
			return () => subscribers.delete(fn);
		},
		getAll,
		getOwnedFarms,
		getById,
		create,
		update,
		remove,
		addMember,
		removeMember,
		// Method to manually refresh data
		refresh: async () => {
			const userId = getUserId();
			if (userId) {
				initialized = false;
				await init(userId);
			}
		}
	};
}

// Export singleton instance
export const farmStore = createFarmStore();
