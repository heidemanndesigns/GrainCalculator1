import { EquipmentService } from '../services/equipmentService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';

/**
 * Equipment store - reactive state management for equipment
 * Uses Svelte 5 runes ($state)
 * Now integrates with Firebase and requires user authentication
 */
export function createEquipmentStore() {
	let equipment = $state([]);
	let initialized = $state(false);
	let loading = $state(false);
	let currentUserId = $state(null);

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 */
	async function init(userId) {
		if (!userId) {
			equipment = [];
			initialized = false;
			currentUserId = null;
			return;
		}

		if (initialized && currentUserId === userId) return;
		
		loading = true;
		try {
			equipment = await EquipmentService.getAll(userId);
			initialized = true;
			currentUserId = userId;
		} catch (error) {
			console.error('Error initializing equipment store:', error);
			equipment = [];
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
	 * Get all equipment
	 */
	async function getAll() {
		const userId = getUserId();
		if (!userId) {
			equipment = [];
			return equipment;
		}
		await init(userId);
		return equipment;
	}

	/**
	 * Get equipment by ID
	 */
	async function getById(id) {
		const userId = getUserId();
		if (!userId || !id) return null;
		
		await init(userId);
		const item = equipment.find((item) => item.id === id);
		if (item) return item;
		
		// If not in local state, fetch from Firestore
		return await EquipmentService.getById(userId, id);
	}

	/**
	 * Add or update equipment
	 */
	async function save(equipmentItem) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to save equipment');
		}

		loading = true;
		try {
			const saved = await EquipmentService.save(userId, equipmentItem);
			// Refresh equipment list
			await init(userId);
			return saved;
		} catch (error) {
			console.error('Error saving equipment:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete equipment
	 */
	async function remove(id) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete equipment');
		}

		loading = true;
		try {
			await EquipmentService.delete(userId, id);
			// Refresh equipment list
			await init(userId);
		} catch (error) {
			console.error('Error deleting equipment:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Update equipment hours
	 */
	async function updateHours(id, hours) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to update equipment');
		}

		loading = true;
		try {
			const updated = await EquipmentService.updateHours(userId, id, hours);
			// Refresh equipment list
			await init(userId);
			return updated;
		} catch (error) {
			console.error('Error updating equipment hours:', error);
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
			return equipment;
		},
		get loading() {
			return loading;
		},
		getAll,
		getById,
		save,
		remove,
		updateHours,
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
export const equipmentStore = createEquipmentStore();

