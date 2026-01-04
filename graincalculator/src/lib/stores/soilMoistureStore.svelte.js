import { SoilMoistureService } from '../services/soilMoistureService.js';
import { authStore } from './authStore.js';
import { get } from 'svelte/store';

/**
 * Soil moisture store - reactive state management for fields and readings
 * Uses Svelte 5 runes ($state)
 * Now integrates with Firebase and requires user authentication
 */
export function createSoilMoistureStore() {
	let fields = $state([]);
	let initialized = $state(false);
	let loading = $state(false);
	let currentUserId = $state(null);

	/**
	 * Initialize store by loading data from service
	 * @param {string} userId - User ID from auth
	 */
	async function init(userId) {
		if (!userId) {
			fields = [];
			initialized = false;
			currentUserId = null;
			return;
		}

		if (initialized && currentUserId === userId) return;
		
		loading = true;
		try {
			fields = await SoilMoistureService.getAllFields(userId);
			initialized = true;
			currentUserId = userId;
		} catch (error) {
			console.error('Error initializing soil moisture store:', error);
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
	 * Get all fields
	 */
	async function getAllFields() {
		const userId = getUserId();
		if (!userId) {
			fields = [];
			return fields;
		}
		await init(userId);
		return fields;
	}

	/**
	 * Get field by ID
	 */
	async function getFieldById(id) {
		const userId = getUserId();
		if (!userId || !id) return null;
		
		await init(userId);
		const field = fields.find((field) => field.id === id);
		if (field) return field;
		
		// If not in local state, fetch from Firestore
		return await SoilMoistureService.getFieldById(userId, id);
	}

	/**
	 * Save field (create or update)
	 */
	async function saveField(field) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to save field');
		}

		loading = true;
		try {
			await SoilMoistureService.saveField(userId, field);
			// Refresh fields list
			await init(userId);
		} catch (error) {
			console.error('Error saving field:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete field
	 */
	async function deleteField(id) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete field');
		}

		loading = true;
		try {
			await SoilMoistureService.deleteField(userId, id);
			// Refresh fields list
			await init(userId);
		} catch (error) {
			console.error('Error deleting field:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Save reading for a field
	 */
	async function saveReading(fieldId, reading) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to save reading');
		}

		loading = true;
		try {
			await SoilMoistureService.saveReading(userId, fieldId, reading);
			// Refresh fields list
			await init(userId);
		} catch (error) {
			console.error('Error saving reading:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	/**
	 * Delete reading from a field
	 */
	async function deleteReading(fieldId, readingId) {
		const userId = getUserId();
		if (!userId) {
			throw new Error('User must be authenticated to delete reading');
		}

		loading = true;
		try {
			await SoilMoistureService.deleteReading(userId, fieldId, readingId);
			// Refresh fields list
			await init(userId);
		} catch (error) {
			console.error('Error deleting reading:', error);
			throw error;
		} finally {
			loading = false;
		}
	}

	return {
		get allFields() {
			const userId = getUserId();
			if (!userId) return [];
			if (!initialized || currentUserId !== userId) {
				// Trigger async load
				init(userId);
			}
			return fields;
		},
		get loading() {
			return loading;
		},
		getAllFields,
		getFieldById,
		saveField,
		deleteField,
		saveReading,
		deleteReading,
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
export const soilMoistureStore = createSoilMoistureStore();

