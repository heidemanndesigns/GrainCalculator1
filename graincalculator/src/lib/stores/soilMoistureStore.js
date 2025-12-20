import { SoilMoistureService } from '../services/soilMoistureService.js';

/**
 * Soil moisture store - reactive state management for fields and readings
 * Uses Svelte 5 runes ($state)
 */
export function createSoilMoistureStore() {
	let fields = $state([]);
	let initialized = $state(false);

	/**
	 * Initialize store by loading data from service
	 */
	function init() {
		if (initialized) return;
		fields = SoilMoistureService.getAllFields();
		initialized = true;
	}

	/**
	 * Get all fields
	 */
	function getAllFields() {
		if (!initialized) init();
		return fields;
	}

	/**
	 * Get field by ID
	 */
	function getFieldById(id) {
		if (!initialized) init();
		return fields.find((field) => field.id === id) || null;
	}

	/**
	 * Save field (create or update)
	 */
	function saveField(field) {
		if (!initialized) init();
		SoilMoistureService.saveField(field);
		fields = SoilMoistureService.getAllFields();
	}

	/**
	 * Delete field
	 */
	function deleteField(id) {
		if (!initialized) init();
		SoilMoistureService.deleteField(id);
		fields = SoilMoistureService.getAllFields();
	}

	/**
	 * Save reading for a field
	 */
	function saveReading(fieldId, reading) {
		if (!initialized) init();
		SoilMoistureService.saveReading(fieldId, reading);
		fields = SoilMoistureService.getAllFields();
	}

	/**
	 * Delete reading from a field
	 */
	function deleteReading(fieldId, readingId) {
		if (!initialized) init();
		SoilMoistureService.deleteReading(fieldId, readingId);
		fields = SoilMoistureService.getAllFields();
	}

	return {
		get allFields() {
			if (!initialized) init();
			return fields;
		},
		getAllFields,
		getFieldById,
		saveField,
		deleteField,
		saveReading,
		deleteReading
	};
}

// Export singleton instance
export const soilMoistureStore = createSoilMoistureStore();

