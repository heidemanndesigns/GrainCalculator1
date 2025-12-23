import { db } from '$lib/firebase/firebase.client';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	deleteDoc,
	query,
	where,
	Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'equipment';

/**
 * Equipment service for managing equipment data
 * Uses Firebase Firestore with per-user data isolation
 */
export class EquipmentService {
	/**
	 * Get all equipment for a user
	 * @param {string} userId - User ID
	 * @returns {Promise<Array>} - Array of equipment items
	 */
	static async getAll(userId) {
		if (!userId) {
			console.warn('No userId provided to EquipmentService.getAll');
			return [];
		}

		try {
			const equipmentRef = collection(db, COLLECTION_NAME);
			const q = query(equipmentRef, where('userId', '==', userId));
			const snapshot = await getDocs(q);
			return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		} catch (error) {
			console.error('Error fetching equipment:', error);
			return [];
		}
	}

	/**
	 * Get equipment by ID
	 * @param {string} userId - User ID
	 * @param {string} id - Equipment ID
	 * @returns {Promise<Object|null>} - Equipment item or null
	 */
	static async getById(userId, id) {
		if (!userId || !id) {
			return null;
		}

		try {
			const equipmentRef = doc(db, COLLECTION_NAME, id);
			const equipmentDoc = await getDoc(equipmentRef);
			
			if (equipmentDoc.exists()) {
				const data = equipmentDoc.data();
				// Verify the equipment belongs to the user
				if (data.userId === userId) {
					return { id: equipmentDoc.id, ...data };
				}
			}
			return null;
		} catch (error) {
			console.error('Error fetching equipment by ID:', error);
			return null;
		}
	}

	/**
	 * Save equipment item (create or update)
	 * @param {string} userId - User ID
	 * @param {Object} equipmentItem - Equipment item to save
	 * @returns {Promise<Object>} - Saved equipment item
	 */
	static async save(userId, equipmentItem) {
		if (!userId) {
			throw new Error('UserId is required to save equipment');
		}

		try {
			const equipmentData = {
				...equipmentItem,
				userId,
				updatedAt: Timestamp.now()
			};

			if (equipmentItem.id) {
				// Update existing
				const equipmentRef = doc(db, COLLECTION_NAME, equipmentItem.id);
				await setDoc(equipmentRef, equipmentData, { merge: true });
				return { id: equipmentItem.id, ...equipmentData };
			} else {
				// Create new
				const equipmentRef = doc(collection(db, COLLECTION_NAME));
				equipmentData.createdAt = Timestamp.now();
				await setDoc(equipmentRef, equipmentData);
				return { id: equipmentRef.id, ...equipmentData };
			}
		} catch (error) {
			console.error('Error saving equipment:', error);
			throw error;
		}
	}

	/**
	 * Delete equipment by ID
	 * @param {string} userId - User ID
	 * @param {string} id - Equipment ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async delete(userId, id) {
		if (!userId || !id) {
			return false;
		}

		try {
			// Verify the equipment belongs to the user before deleting
			const equipment = await this.getById(userId, id);
			if (!equipment) {
				console.warn('Equipment not found or does not belong to user');
				return false;
			}

			const equipmentRef = doc(db, COLLECTION_NAME, id);
			await deleteDoc(equipmentRef);
			return true;
		} catch (error) {
			console.error('Error deleting equipment:', error);
			return false;
		}
	}

	/**
	 * Update equipment hours
	 * @param {string} userId - User ID
	 * @param {string} id - Equipment ID
	 * @param {number} hours - New total hours
	 * @returns {Promise<Object|null>} - Updated equipment item or null
	 */
	static async updateHours(userId, id, hours) {
		if (!userId || !id) {
			return null;
		}

		try {
			const equipmentRef = doc(db, COLLECTION_NAME, id);
			const equipmentDoc = await getDoc(equipmentRef);
			
			if (equipmentDoc.exists()) {
				const data = equipmentDoc.data();
				// Verify the equipment belongs to the user
				if (data.userId === userId) {
					await setDoc(equipmentRef, {
						totalHours: hours,
						updatedAt: Timestamp.now()
					}, { merge: true });
					return { id: equipmentDoc.id, ...data, totalHours: hours };
				}
			}
			return null;
		} catch (error) {
			console.error('Error updating equipment hours:', error);
			return null;
		}
	}
}

