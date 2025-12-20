import { StorageService } from './storageService.js';

const STORAGE_KEY = 'soilMoistureFields';

/**
 * Soil moisture service for managing field and reading data
 * Currently uses localStorage, will be replaced with Firebase later
 */
export class SoilMoistureService {
	/**
	 * Get all fields
	 * @returns {Array} - Array of field objects
	 */
	static getAllFields() {
		return StorageService.get(STORAGE_KEY) || [];
	}

	/**
	 * Get field by ID
	 * @param {string} id - Field ID
	 * @returns {Object|null} - Field object or null
	 */
	static getFieldById(id) {
		const fields = this.getAllFields();
		return fields.find((field) => field.id === id) || null;
	}

	/**
	 * Save field (create or update)
	 * @param {Object} field - Field object to save
	 * @returns {Object} - Saved field object
	 */
	static saveField(field) {
		const fields = this.getAllFields();
		const existingIndex = fields.findIndex((f) => f.id === field.id);

		if (existingIndex !== -1) {
			// Update existing
			fields[existingIndex] = { ...field };
		} else {
			// Create new
			if (!field.id) {
				field.id = Date.now().toString();
			}
			if (!field.readings) {
				field.readings = [];
			}
			fields.push(field);
		}

		StorageService.set(STORAGE_KEY, fields);
		return field;
	}

	/**
	 * Delete field by ID
	 * @param {string} id - Field ID
	 * @returns {boolean} - Success status
	 */
	static deleteField(id) {
		const fields = this.getAllFields();
		const filtered = fields.filter((f) => f.id !== id);
		StorageService.set(STORAGE_KEY, filtered);
		return true;
	}

	/**
	 * Add or update reading for a field
	 * @param {string} fieldId - Field ID
	 * @param {Object} reading - Reading object
	 * @returns {Object} - Saved reading object
	 */
	static saveReading(fieldId, reading) {
		const fields = this.getAllFields();
		const field = fields.find((f) => f.id === fieldId);
		
		if (!field) {
			throw new Error(`Field with id ${fieldId} not found`);
		}

		if (!field.readings) {
			field.readings = [];
		}

		const existingIndex = reading.id
			? field.readings.findIndex((r) => r.id === reading.id)
			: -1;

		if (existingIndex !== -1) {
			// Update existing
			field.readings[existingIndex] = { ...reading };
		} else {
			// Create new
			if (!reading.id) {
				reading.id = Date.now().toString();
			}
			field.readings.push(reading);
		}

		// Sort readings by date (newest first)
		field.readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		StorageService.set(STORAGE_KEY, fields);
		return reading;
	}

	/**
	 * Delete reading from a field
	 * @param {string} fieldId - Field ID
	 * @param {string} readingId - Reading ID
	 * @returns {boolean} - Success status
	 */
	static deleteReading(fieldId, readingId) {
		const fields = this.getAllFields();
		const field = fields.find((f) => f.id === fieldId);
		
		if (!field || !field.readings) {
			return false;
		}

		field.readings = field.readings.filter((r) => r.id !== readingId);
		StorageService.set(STORAGE_KEY, fields);
		return true;
	}
}

