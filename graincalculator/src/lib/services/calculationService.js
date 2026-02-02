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
	orderBy,
	updateDoc,
	arrayUnion,
	Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'calculations';

/**
 * Calculation service for managing grain calculation data
 * Uses Firebase Firestore with farm and field-based access control
 */
export class CalculationService {
	/**
	 * Get all calculations for a field (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 * @returns {Promise<Array>} - Array of calculation objects
	 */
	static async getAll(userId, farmId, fieldId) {
		if (!userId || !farmId || !fieldId) {
			console.warn('No userId, farmId, or fieldId provided to CalculationService.getAll');
			return [];
		}

		// Verify user has access to the farm
		const { FarmService } = await import('./farmService.js');
		const farm = await FarmService.getById(userId, farmId);
		if (!farm) {
			console.warn('User does not have access to this farm');
			return [];
		}

		// Avoid composite index requirements:
		// query by a single equality (fieldId) and sort on client
		const calculationsRef = collection(db, COLLECTION_NAME);
		const q = query(calculationsRef, where('fieldId', '==', fieldId));
		const snapshot = await getDocs(q);
		const calculations = snapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				...data,
				date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
				createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
				updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
			};
		});
		// Sort manually by createdAt desc (fallback to date)
		calculations.sort((a, b) => {
			const dateA = new Date(a.createdAt || a.date);
			const dateB = new Date(b.createdAt || b.date);
			return dateB - dateA;
		});
		return calculations;
	}

	/**
	 * Get calculation by ID (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 * @param {string} id - Calculation ID
	 * @returns {Promise<Object|null>} - Calculation object or null
	 */
	static async getById(userId, farmId, fieldId, id) {
		if (!userId || !farmId || !fieldId || !id) {
			return null;
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				return null;
			}

			const calculationRef = doc(db, COLLECTION_NAME, id);
			const calculationDoc = await getDoc(calculationRef);

			if (calculationDoc.exists()) {
				const data = calculationDoc.data();
				// Verify the calculation belongs to the farm and field
				if (data.farmId === farmId && data.fieldId === fieldId) {
					return {
						id: calculationDoc.id,
						...data,
						date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
						createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
						updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
					};
				}
			}
			return null;
		} catch (error) {
			console.error('Error fetching calculation by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new calculation (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 * @param {Object} calculationData - Calculation data
	 * @returns {Promise<Object>} - Created calculation object
	 */
	static async create(userId, farmId, fieldId, calculationData) {
		if (!userId || !farmId || !fieldId) {
			throw new Error('UserId, farmId, and fieldId are required to create a calculation');
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				throw new Error('User does not have access to this farm');
			}

			// Verify field exists
			const { FieldService } = await import('./fieldService.js');
			const field = await FieldService.getById(userId, farmId, fieldId);
			if (!field) {
				throw new Error('Field not found or does not belong to this farm');
			}

			const calculationRef = doc(collection(db, COLLECTION_NAME));
			const calculationDataToSave = {
				farmId,
				fieldId,
				userId,
				date: calculationData.date ? Timestamp.fromDate(new Date(calculationData.date)) : Timestamp.now(),
				operator: calculationData.operator || '',
				loadNumber: calculationData.loadNumber || '',
				wetWeight: calculationData.wetWeight || 0,
				moistureContent: calculationData.moistureContent || 0,
				targetMoisture: calculationData.targetMoisture || 15.5,
				manualShrinkFactor: calculationData.manualShrinkFactor || 0,
				calculatedWetBushels: calculationData.calculatedWetBushels || 0,
				calculatedDryWeight: calculationData.calculatedDryWeight || 0,
				calculatedDryBushels: calculationData.calculatedDryBushels || 0,
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now()
			};

			await setDoc(calculationRef, calculationDataToSave);
			// Also push the full calculation object into the Field document's calculations array
			try {
				const fieldRef = doc(db, 'Fields', fieldId);
				const calculationSummaryForField = {
					id: calculationRef.id,
					date: calculationDataToSave.date,
					createdAt: calculationDataToSave.createdAt,
					updatedAt: calculationDataToSave.updatedAt,
					operator: calculationDataToSave.operator,
					loadNumber: calculationDataToSave.loadNumber,
					wetWeight: calculationDataToSave.wetWeight,
					moistureContent: calculationDataToSave.moistureContent,
					targetMoisture: calculationDataToSave.targetMoisture,
					manualShrinkFactor: calculationDataToSave.manualShrinkFactor,
					calculatedWetBushels: calculationDataToSave.calculatedWetBushels,
					calculatedDryWeight: calculationDataToSave.calculatedDryWeight,
					calculatedDryBushels: calculationDataToSave.calculatedDryBushels
				};
				await updateDoc(fieldRef, {
					calculations: arrayUnion(calculationSummaryForField),
					updatedAt: Timestamp.now()
				});
			} catch (e) {
				console.warn('Warning: failed to append calculation to field', e);
			}
			return {
				id: calculationRef.id,
				...calculationDataToSave,
				date: calculationDataToSave.date.toDate().toISOString(),
				createdAt: calculationDataToSave.createdAt.toDate().toISOString(),
				updatedAt: calculationDataToSave.updatedAt.toDate().toISOString()
			};
		} catch (error) {
			console.error('Error creating calculation:', error);
			throw error;
		}
	}

	/**
	 * Update calculation (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 * @param {string} id - Calculation ID
	 * @param {Object} calculationData - Calculation data to update
	 * @returns {Promise<Object|null>} - Updated calculation object or null
	 */
	static async update(userId, farmId, fieldId, id, calculationData) {
		if (!userId || !farmId || !fieldId || !id) {
			throw new Error('UserId, farmId, fieldId, and calculation ID are required to update a calculation');
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				throw new Error('User does not have access to this farm');
			}

			// Verify the calculation exists and belongs to the farm and field
			const existingCalculation = await this.getById(userId, farmId, fieldId, id);
			if (!existingCalculation) {
				throw new Error('Calculation not found or does not belong to this farm and field');
			}

			const calculationRef = doc(db, COLLECTION_NAME, id);
			const updateData = {
				...calculationData,
				updatedAt: Timestamp.now()
			};

			// Convert date string to Timestamp if provided
			if (updateData.date) {
				updateData.date = Timestamp.fromDate(new Date(updateData.date));
			}

			// Don't allow changing farmId, fieldId, userId, or createdAt
			delete updateData.farmId;
			delete updateData.fieldId;
			delete updateData.userId;
			delete updateData.createdAt;

			await setDoc(calculationRef, updateData, { merge: true });
			return await this.getById(userId, farmId, fieldId, id);
		} catch (error) {
			console.error('Error updating calculation:', error);
			throw error;
		}
	}

	/**
	 * Delete calculation (user must be a member of the farm)
	 * @param {string} userId - User ID
	 * @param {string} farmId - Farm ID
	 * @param {string} fieldId - Field ID
	 * @param {string} id - Calculation ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async delete(userId, farmId, fieldId, id) {
		if (!userId || !farmId || !fieldId || !id) {
			return false;
		}

		try {
			// Verify user has access to the farm
			const { FarmService } = await import('./farmService.js');
			const farm = await FarmService.getById(userId, farmId);
			if (!farm) {
				return false;
			}

			// Verify the calculation exists and belongs to the farm and field
			const calculation = await this.getById(userId, farmId, fieldId, id);
			if (!calculation) {
				return false;
			}

			const calculationRef = doc(db, COLLECTION_NAME, id);
			await deleteDoc(calculationRef);
			return true;
		} catch (error) {
			console.error('Error deleting calculation:', error);
			return false;
		}
	}
}
