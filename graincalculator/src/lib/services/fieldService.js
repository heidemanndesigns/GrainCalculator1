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
	updateDoc,
	arrayUnion,
	arrayRemove,
	Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'Fields';

/**
 * Field service for managing field/plot data per farm
 * Uses Firebase Firestore with farm-based access control
 */
export class FieldService {
	/**
	 * Get all fields for a farm (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @returns {Promise<Array>} - Array of field objects
	 */
	static async getAll(userId, farmId) {
		if (!userId || !farmId) {
			console.warn('No userId or farmId provided to FieldService.getAll');
			return [];
		}

		try {
			// Import farmService to verify user has access
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				console.warn('User does not have access to this farm');
				return [];
			}

			const fieldsRef = collection(db, COLLECTION_NAME);
			const q = query(fieldsRef, where('farmId', '==', farmId));
			const snapshot = await getDocs(q);
			const fields = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					...data,
					createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
					updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
				};
			});
			return fields;
		} catch (error) {
			console.error('Error fetching fields:', error);
			return [];
		}
	}

	/**
	 * Get field by ID (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} id - Field ID
	 * @returns {Promise<Object|null>} - Field object or null
	 */
	static async getById(userId, farmId, id) {
		if (!userId || !farmId || !id) {
			return null;
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				return null;
			}

			const fieldRef = doc(db, COLLECTION_NAME, id);
			const fieldDoc = await getDoc(fieldRef);

			if (fieldDoc.exists()) {
				const data = fieldDoc.data();
				// Verify the field belongs to the farm
				if (data.farmId === farmId) {
					return {
						id: fieldDoc.id,
						...data,
						createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
						updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
					};
				}
			}
			return null;
		} catch (error) {
			console.error('Error fetching field by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new field (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {Object} fieldData - Field data (name and acres are required)
	 * @returns {Promise<Object>} - Created field object
	 */
	static async create(userId, farmId, fieldData) {
		if (!userId || !farmId) {
			throw new Error('UserId and farmId are required to create a field');
		}

		if (!fieldData.name || !fieldData.name.trim()) {
			throw new Error('Field name is required');
		}

		if (typeof fieldData.acres !== 'number' || fieldData.acres <= 0) {
			throw new Error('Field acres must be a positive number');
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				throw new Error('User does not have access to this farm');
			}

			const fieldRef = doc(collection(db, COLLECTION_NAME));
			const fieldDataToSave = {
				farmId,
				name: fieldData.name.trim(),
				acres: fieldData.acres,
				calculations: [], // lightweight list of recent calculation summaries
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now()
			};

			await setDoc(fieldRef, fieldDataToSave);
			// add field id to farm.fieldIds
			try {
				const farmRef = doc(db, 'Farms', farmId);
				await updateDoc(farmRef, {
					fieldIds: arrayUnion(fieldRef.id),
					updatedAt: Timestamp.now()
				});
			} catch (e) {
				console.warn('Warning: failed to update farm fieldIds after field create', e);
			}
			return {
				id: fieldRef.id,
				...fieldDataToSave,
				createdAt: fieldDataToSave.createdAt.toDate().toISOString(),
				updatedAt: fieldDataToSave.updatedAt.toDate().toISOString()
			};
		} catch (error) {
			console.error('Error creating field:', error);
			throw error;
		}
	}

	/**
	 * Update field (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} id - Field ID
	 * @param {Object} fieldData - Field data to update
	 * @returns {Promise<Object|null>} - Updated field object or null
	 */
	static async update(userId, farmId, id, fieldData) {
		if (!userId || !farmId || !id) {
			throw new Error('UserId, farmId, and field ID are required to update a field');
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				throw new Error('User does not have access to this farm');
			}

			// Verify the field exists and belongs to the farm
			const existingField = await this.getById(userId, farmId, id);
			if (!existingField) {
				throw new Error('Field not found or does not belong to this farm');
			}

			const fieldRef = doc(db, COLLECTION_NAME, id);
			const updateData = {
				...fieldData,
				updatedAt: Timestamp.now()
			};

			// Don't allow changing farmId or createdAt
			delete updateData.farmId;
			delete updateData.createdAt;

			await setDoc(fieldRef, updateData, { merge: true });
			return await this.getById(userId, farmId, id);
		} catch (error) {
			console.error('Error updating field:', error);
			throw error;
		}
	}

	/**
	 * Delete field (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} id - Field ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async delete(userId, farmId, id) {
		if (!userId || !farmId || !id) {
			return false;
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				return false;
			}

			// Verify the field exists and belongs to the farm
			const field = await this.getById(userId, farmId, id);
			if (!field) {
				return false;
			}

			const fieldRef = doc(db, COLLECTION_NAME, id);
			await deleteDoc(fieldRef);
			// remove field id from farm.fieldIds
			try {
				const farmRef = doc(db, 'Farms', farmId);
				await updateDoc(farmRef, {
					fieldIds: arrayRemove(id),
					updatedAt: Timestamp.now()
				});
			} catch (e) {
				console.warn('Warning: failed to update farm fieldIds after field delete', e);
			}
			return true;
		} catch (error) {
			console.error('Error deleting field:', error);
			return false;
		}
	}
}
