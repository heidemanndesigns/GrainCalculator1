import { EquipmentService } from '../services/equipmentService.js';

/**
 * Equipment store - reactive state management for equipment
 * Uses Svelte 5 runes ($state)
 */
export function createEquipmentStore() {
	let equipment = $state([]);
	let initialized = $state(false);

	/**
	 * Initialize store by loading data from service
	 */
	function init() {
		if (initialized) return;
		equipment = EquipmentService.getAll();
		initialized = true;
	}

	/**
	 * Get all equipment
	 */
	function getAll() {
		if (!initialized) init();
		return equipment;
	}

	/**
	 * Get equipment by ID
	 */
	function getById(id) {
		if (!initialized) init();
		return equipment.find((item) => item.id === id) || null;
	}

	/**
	 * Add or update equipment
	 */
	function save(equipmentItem) {
		if (!initialized) init();
		const saved = EquipmentService.save(equipmentItem);
		equipment = EquipmentService.getAll();
		return saved;
	}

	/**
	 * Delete equipment
	 */
	function remove(id) {
		if (!initialized) init();
		EquipmentService.delete(id);
		equipment = EquipmentService.getAll();
	}

	/**
	 * Update equipment hours
	 */
	function updateHours(id, hours) {
		if (!initialized) init();
		EquipmentService.updateHours(id, hours);
		equipment = EquipmentService.getAll();
	}

	return {
		get all() {
			if (!initialized) init();
			return equipment;
		},
		getAll,
		getById,
		save,
		remove,
		updateHours
	};
}

// Export singleton instance
export const equipmentStore = createEquipmentStore();

