/**
 * Base storage service for localStorage operations
 * This will be replaced with Firebase service later
 */
export class StorageService {
	/**
	 * Get item from localStorage
	 * @param {string} key - Storage key
	 * @returns {any|null} - Parsed value or null
	 */
	static get(key) {
		if (typeof window === 'undefined') return null;
		
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : null;
		} catch (error) {
			console.error(`Error reading from localStorage key "${key}":`, error);
			return null;
		}
	}

	/**
	 * Set item in localStorage
	 * @param {string} key - Storage key
	 * @param {any} value - Value to store
	 * @returns {boolean} - Success status
	 */
	static set(key, value) {
		if (typeof window === 'undefined') return false;
		
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			console.error(`Error writing to localStorage key "${key}":`, error);
			return false;
		}
	}

	/**
	 * Remove item from localStorage
	 * @param {string} key - Storage key
	 * @returns {boolean} - Success status
	 */
	static remove(key) {
		if (typeof window === 'undefined') return false;
		
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.error(`Error removing from localStorage key "${key}":`, error);
			return false;
		}
	}

	/**
	 * Clear all items from localStorage
	 * @returns {boolean} - Success status
	 */
	static clear() {
		if (typeof window === 'undefined') return false;
		
		try {
			localStorage.clear();
			return true;
		} catch (error) {
			console.error('Error clearing localStorage:', error);
			return false;
		}
	}
}

