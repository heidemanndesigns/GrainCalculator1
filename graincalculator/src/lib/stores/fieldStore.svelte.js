import { FieldService } from '../services/fieldService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';

/**
 * Field store - reactive state management for fields/plots
 * Uses Svelte 5 runes ($state)
 * Integrates with Firebase and requires user authentication
 */
export function createFieldStore() {
	let fields = $state([]);
	let initialized = $state(false);
	let loading = $state(false);
	let currentUserId = $state(null);
	let currentFarmId = $state(null);

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 * @param {string} farmId - Farm ID
	 */
	async function init(userId, farmId) {
		if (!userId || !farmId) {
			fields = [];
			initialized = false;
			currentUserId = null;
			currentFarmId = null;
			return;
		}

		if (initialized && currentUserId === userId && currentFarmId === farmId) return;
		
		loading = true;
		try {
			fields = await FieldService.getAll(userId, farmId);
			initialized = true;
			currentUserId = userId;
			currentFarmId = farmId;
		} catch (error) {
			console.error('Error initializing field store:', error);
			fields = [];
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
	 * Get all fields for a farm
	 */
	async function getAll(farmId) {
		const userId = getUserId();
		if (!userId || !farmId) {
			fields = [];
			return fields;
		}
		await init(userId, farmId);
		return fields;
	}

	/**
	 * Get field by ID
	 */
	async function getById(farmId, id) {
		const userId = getUserId();
		if (!userId || !farmId || !id) return null;
		
		await init(userId, farmId);
		const field = fields.find((field) => field.id === id);
		if (field) return field;
		
		// If not in local state, fetch from Firestore
		return await FieldService.getById(userId, farmId, id);
	}

	/**
	 * Create a new field
	 */
	async function create(farmId, fieldData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to create a field');
		}

		loading = true;
		try {
			const saved = await FieldService.create(userId, farmId, fieldData);
			// Refresh fields list
			await init(userId, farmId);
			return saved;
		} catch (error) {
			console.error('Error creating field:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Update field
	 */
	async function update(farmId, id, fieldData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to update a field');
		}

		loading = true;
		try {
			const updated = await FieldService.update(userId, farmId, id, fieldData);
			// Refresh fields list
			await init(userId, farmId);
			return updated;
		} catch (error) {
			console.error('Error updating field:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete field
	 */
	async function remove(farmId, id) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete a field');
		}

		loading = true;
		try {
			await FieldService.delete(userId, farmId, id);
			// Refresh fields list
			await init(userId, farmId);
		} catch (error) {
			console.error('Error deleting field:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	return {
		get all() {
			// Note: This requires farmId to be passed via getAll() method
			return fields;
		},
		get loading() {
			return loading;
		},
		getAll,
		getById,
		create,
		update,
		remove,
		// Method to manually refresh data
		refresh: async (farmId) => {
			const userId = getUserId();
			if (userId && farmId) {
				initialized = false;
				await init(userId, farmId);
			}
		}
	};
}

// Export singleton instance
export const fieldStore = createFieldStore();

