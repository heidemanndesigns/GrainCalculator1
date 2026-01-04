import { FarmService } from '../services/farmService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';

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

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 */
	async function init(userId) {
		if (!userId) {
			farms = [];
			initialized = false;
			currentUserId = null;
			return;
		}

		if (initialized && currentUserId === userId) return;
		
		loading = true;
		try {
			farms = await FarmService.getAll(userId);
			initialized = true;
			currentUserId = userId;
		} catch (error) {
			console.error('Error initializing farm store:', error);
			farms = [];
		} finally {
			loading = false;
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
			farms = [];
			return farms;
		}
		await init(userId);
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
			const saved = await FarmService.create(userId, farmData);
			// Refresh farms list
			await init(userId);
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
			const updated = await FarmService.update(userId, id, farmData);
			// Refresh farms list
			await init(userId);
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
			// Refresh farms list
			await init(userId);
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
			// Refresh farms list
			await init(userId);
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
			// Refresh farms list
			await init(userId);
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

