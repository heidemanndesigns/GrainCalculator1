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

const COLLECTION_NAME = 'soilMoistureFields';

/**
 * Soil moisture service for managing field and reading data
 * Uses Firebase Firestore with per-user data isolation
 */
export class SoilMoistureService {
	/**
	 * Get all fields for a user
	 * @param {string} userId - User ID
	 * @returns {Promise<Array>} - Array of field objects
	 */
	static async getAllFields(userId) {
		if (!userId) {
			console.warn('No userId provided to SoilMoistureService.getAllFields');
			return [];
		}

		try {
			const fieldsRef = collection(db, COLLECTION_NAME);
			const q = query(fieldsRef, where('userId', '==', userId));
			const snapshot = await getDocs(q);
			const fields = snapshot.docs.map((doc) => {
				const data = doc.data();
				// Convert Firestore Timestamps to dates for readings
				if (data.readings && Array.isArray(data.readings)) {
					data.readings = data.readings.map((reading) => ({
						...reading,
						date: reading.date?.toDate ? reading.date.toDate().toISOString() : reading.date
					}));
				}
				return { id: doc.id, ...data };
			});
			return fields;
		} catch (error) {
			console.error('Error fetching fields:', error);
			return [];
		}
	}

	/**
	 * Get field by ID
	 * @param {string} userId - User ID
	 * @param {string} id - Field ID
	 * @returns {Promise<Object|null>} - Field object or null
	 */
	static async getFieldById(userId, id) {
		if (!userId || !id) {
			return null;
		}

		try {
			const fieldRef = doc(db, COLLECTION_NAME, id);
			const fieldDoc = await getDoc(fieldRef);
			
			if (fieldDoc.exists()) {
				const data = fieldDoc.data();
				// Verify the field belongs to the user
				if (data.userId === userId) {
					// Convert Firestore Timestamps to dates for readings
					if (data.readings && Array.isArray(data.readings)) {
						data.readings = data.readings.map((reading) => ({
							...reading,
							date: reading.date?.toDate ? reading.date.toDate().toISOString() : reading.date
						}));
					}
					return { id: fieldDoc.id, ...data };
				}
			}
			return null;
		} catch (error) {
			console.error('Error fetching field by ID:', error);
			return null;
		}
	}

	/**
	 * Save field (create or update)
	 * @param {string} userId - User ID
	 * @param {Object} field - Field object to save
	 * @returns {Promise<Object>} - Saved field object
	 */
	static async saveField(userId, field) {
		if (!userId) {
			throw new Error('UserId is required to save field');
		}

		try {
			const fieldData = {
				...field,
				userId,
				updatedAt: Timestamp.now()
			};

			// Ensure readings array exists
			if (!fieldData.readings) {
				fieldData.readings = [];
			}

			// Convert date strings to Timestamps for readings
			if (fieldData.readings && Array.isArray(fieldData.readings)) {
				fieldData.readings = fieldData.readings.map((reading) => ({
					...reading,
					date: reading.date ? Timestamp.fromDate(new Date(reading.date)) : Timestamp.now()
				}));
			}

			if (field.id) {
				// Update existing
				const fieldRef = doc(db, COLLECTION_NAME, field.id);
				await setDoc(fieldRef, fieldData, { merge: true });
				return { id: field.id, ...fieldData };
			} else {
				// Create new
				const fieldRef = doc(collection(db, COLLECTION_NAME));
				fieldData.createdAt = Timestamp.now();
				await setDoc(fieldRef, fieldData);
				return { id: fieldRef.id, ...fieldData };
			}
		} catch (error) {
			console.error('Error saving field:', error);
			throw error;
		}
	}

	/**
	 * Delete field by ID
	 * @param {string} userId - User ID
	 * @param {string} id - Field ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async deleteField(userId, id) {
		if (!userId || !id) {
			return false;
		}

		try {
			// Verify the field belongs to the user before deleting
			const field = await this.getFieldById(userId, id);
			if (!field) {
				console.warn('Field not found or does not belong to user');
				return false;
			}

			const fieldRef = doc(db, COLLECTION_NAME, id);
			await deleteDoc(fieldRef);
			return true;
		} catch (error) {
			console.error('Error deleting field:', error);
			return false;
		}
	}

	/**
	 * Add or update reading for a field
	 * @param {string} userId - User ID
	 * @param {string} fieldId - Field ID
	 * @param {Object} reading - Reading object
	 * @returns {Promise<Object>} - Saved reading object
	 */
	static async saveReading(userId, fieldId, reading) {
		if (!userId || !fieldId) {
			throw new Error('UserId and fieldId are required to save reading');
		}

		try {
			// Verify the field belongs to the user
			const field = await this.getFieldById(userId, fieldId);
			if (!field) {
				throw new Error(`Field with id ${fieldId} not found or does not belong to user`);
			}

			const fieldRef = doc(db, COLLECTION_NAME, fieldId);
			const readingData = {
				...reading,
				date: reading.date ? Timestamp.fromDate(new Date(reading.date)) : Timestamp.now()
			};

			if (reading.id) {
				// Update existing reading
				const fieldDoc = await getDoc(fieldRef);
				if (fieldDoc.exists()) {
					const fieldData = fieldDoc.data();
					const readings = fieldData.readings || [];
					const readingIndex = readings.findIndex((r) => r.id === reading.id);
					
					if (readingIndex !== -1) {
						readings[readingIndex] = readingData;
						// Sort readings by date (newest first)
						readings.sort((a, b) => {
							const dateA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
							const dateB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
							return dateB - dateA;
						});
						await updateDoc(fieldRef, {
							readings,
							updatedAt: Timestamp.now()
						});
					} else {
						throw new Error(`Reading with id ${reading.id} not found`);
					}
				}
			} else {
				// Create new reading
				readingData.id = Date.now().toString();
				const fieldDoc = await getDoc(fieldRef);
				if (fieldDoc.exists()) {
					const fieldData = fieldDoc.data();
					const readings = fieldData.readings || [];
					readings.push(readingData);
					// Sort readings by date (newest first)
					readings.sort((a, b) => {
						const dateA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
						const dateB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
						return dateB - dateA;
					});
					await updateDoc(fieldRef, {
						readings,
						updatedAt: Timestamp.now()
					});
				}
			}

			return readingData;
		} catch (error) {
			console.error('Error saving reading:', error);
			throw error;
		}
	}

	/**
	 * Delete reading from a field
	 * @param {string} userId - User ID
	 * @param {string} fieldId - Field ID
	 * @param {string} readingId - Reading ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async deleteReading(userId, fieldId, readingId) {
		if (!userId || !fieldId || !readingId) {
			return false;
		}

		try {
			// Verify the field belongs to the user
			const field = await this.getFieldById(userId, fieldId);
			if (!field || !field.readings) {
				return false;
			}

			const fieldRef = doc(db, COLLECTION_NAME, fieldId);
			const fieldDoc = await getDoc(fieldRef);
			
			if (fieldDoc.exists()) {
				const fieldData = fieldDoc.data();
				const readings = fieldData.readings || [];
				const filteredReadings = readings.filter((r) => r.id !== readingId);
				
				await updateDoc(fieldRef, {
					readings: filteredReadings,
					updatedAt: Timestamp.now()
				});
				return true;
			}
			
			return false;
		} catch (error) {
			console.error('Error deleting reading:', error);
			return false;
		}
	}
}

