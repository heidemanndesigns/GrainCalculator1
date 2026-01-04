import { CalculationService } from '../services/calculationService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';

/**
 * Calculation store - reactive state management for calculations
 * Uses Svelte 5 runes ($state)
 * Integrates with Firebase and requires user authentication
 */
export function createCalculationStore() {
	let calculations = $state([]);
	let initialized = $state(false);
	let loading = $state(false);
	let currentUserId = $state(null);
	let currentFarmId = $state(null);
	let currentFieldId = $state(null);

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 */
	async function init(userId, farmId, fieldId) {
		if (!userId || !farmId || !fieldId) {
			calculations = [];
			initialized = false;
			currentUserId = null;
			currentFarmId = null;
			currentFieldId = null;
			return;
		}

		if (initialized && currentUserId === userId && currentFarmId === farmId && currentFieldId === fieldId) return;
		
		loading = true;
		try {
			calculations = await CalculationService.getAll(userId, farmId, fieldId);
			initialized = true;
			currentUserId = userId;
			currentFarmId = farmId;
			currentFieldId = fieldId;
		} catch (error) {
			console.error('Error initializing calculation store:', error);
			calculations = [];
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
	 * Get all calculations for a field
	 */
	async function getAll(farmId, fieldId) {
		const userId = getUserId();
		if (!userId || !farmId || !fieldId) {
			calculations = [];
			return calculations;
		}
		await init(userId, farmId, fieldId);
		return calculations;
	}

	/**
	 * Get calculation by ID
	 */
	async function getById(farmId, fieldId, id) {
		const userId = getUserId();
		if (!userId || !farmId || !fieldId || !id) return null;
		
		await init(userId, farmId, fieldId);
		const calculation = calculations.find((calc) => calc.id === id);
		if (calculation) return calculation;
		
		// If not in local state, fetch from Firestore
		return await CalculationService.getById(userId, farmId, fieldId, id);
	}

	/**
	 * Create a new calculation
	 */
	async function create(farmId, fieldId, calculationData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to create a calculation');
		}

		loading = true;
		try {
			const saved = await CalculationService.create(userId, farmId, fieldId, calculationData);
			// Refresh calculations list
			await init(userId, farmId, fieldId);
			return saved;
		} catch (error) {
			console.error('Error creating calculation:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Update calculation
	 */
	async function update(farmId, fieldId, id, calculationData) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to update a calculation');
		}

		loading = true;
		try {
			const updated = await CalculationService.update(userId, farmId, fieldId, id, calculationData);
			// Refresh calculations list
			await init(userId, farmId, fieldId);
			return updated;
		} catch (error) {
			console.error('Error updating calculation:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete calculation
	 */
	async function remove(farmId, fieldId, id) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete a calculation');
		}

		loading = true;
		try {
			await CalculationService.delete(userId, farmId, fieldId, id);
			// Refresh calculations list
			await init(userId, farmId, fieldId);
		} catch (error) {
			console.error('Error deleting calculation:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	return {
		get all() {
			// Note: This requires farmId and fieldId to be passed via getAll() method
			return calculations;
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
		refresh: async (farmId, fieldId) => {
			const userId = getUserId();
			if (userId && farmId && fieldId) {
				initialized = false;
				await init(userId, farmId, fieldId);
			}
		}
	};
}

// Export singleton instance
export const calculationStore = createCalculationStore();

