import { StorageService } from './storageService.js';

const STORAGE_KEY = 'equipment';

/**
 * Equipment service for managing equipment data
 * Currently uses localStorage, will be replaced with Firebase later
 */
export class EquipmentService {
	/**
	 * Get all equipment
	 * @returns {Array} - Array of equipment items
	 */
	static getAll() {
		return StorageService.get(STORAGE_KEY) || [];
	}

	/**
	 * Get equipment by ID
	 * @param {string} id - Equipment ID
	 * @returns {Object|null} - Equipment item or null
	 */
	static getById(id) {
		const equipment = this.getAll();
		return equipment.find((item) => item.id === id) || null;
	}

	/**
	 * Save equipment item (create or update)
	 * @param {Object} equipmentItem - Equipment item to save
	 * @returns {Object} - Saved equipment item
	 */
	static save(equipmentItem) {
		const equipment = this.getAll();
		const existingIndex = equipment.findIndex((item) => item.id === equipmentItem.id);

		if (existingIndex !== -1) {
			// Update existing
			equipment[existingIndex] = { ...equipmentItem };
		} else {
			// Create new
			if (!equipmentItem.id) {
				equipmentItem.id = Date.now().toString();
			}
			equipment.push(equipmentItem);
		}

		StorageService.set(STORAGE_KEY, equipment);
		return equipmentItem;
	}

	/**
	 * Delete equipment by ID
	 * @param {string} id - Equipment ID
	 * @returns {boolean} - Success status
	 */
	static delete(id) {
		const equipment = this.getAll();
		const filtered = equipment.filter((item) => item.id !== id);
		StorageService.set(STORAGE_KEY, filtered);
		return true;
	}

	/**
	 * Update equipment hours
	 * @param {string} id - Equipment ID
	 * @param {number} hours - New total hours
	 * @returns {Object|null} - Updated equipment item or null
	 */
	static updateHours(id, hours) {
		const equipment = this.getAll();
		const item = equipment.find((e) => e.id === id);
		
		if (item) {
			item.totalHours = hours;
			StorageService.set(STORAGE_KEY, equipment);
			return item;
		}
		
		return null;
	}
}

