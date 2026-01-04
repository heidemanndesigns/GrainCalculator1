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

const COLLECTION_NAME = 'Farms';

/**
 * Farm service for managing farm data
 * Uses Firebase Firestore with user-based access control
 */
export class FarmService {
	/**
	 * Get all farms for a user (farms they own or are a member of)
	 * @param {string} userId - User ID
	 * @returns {Promise<Array>} - Array of farm objects
	 */
	static async getAll(userId) {
		if (!userId) {
			console.warn('No userId provided to FarmService.getAll');
			return [];
		}

		try {
			console.log('[FarmService.getAll] userId', userId);
			const farmsRef = collection(db, COLLECTION_NAME);
			// Primary: farms where the user is a member
			let farms = [];
			try {
				const qMembers = query(farmsRef, where('memberIds', 'array-contains', userId));
				const snapshotMembers = await getDocs(qMembers);
				farms = snapshotMembers.docs.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
						updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
					};
				});
			} catch (e) {
				console.warn('[FarmService.getAll] memberIds query failed, will try owner fallback', e);
			}
			// Fallback: farms owned by the user (merge uniques)
			try {
				const qOwner = query(farmsRef, where('ownerId', '==', userId));
				const snapshotOwner = await getDocs(qOwner);
				const ownerFarms = snapshotOwner.docs.map((doc) => {
					const data = doc.data();
					return {
						id: doc.id,
						...data,
						createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
						updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
					};
				});
				const seen = new Set(farms.map((f) => f.id));
				for (const f of ownerFarms) {
					if (!seen.has(f.id)) {
						farms.push(f);
					}
				}
			} catch (e) {
				console.warn('[FarmService.getAll] ownerId fallback query failed', e);
			}
			console.log('[FarmService.getAll] result count', farms.length);
			return farms;
		} catch (error) {
			console.error('Error fetching farms:', error);
			return [];
		}
	}

	/**
	 * Get farms owned by a user
	 * @param {string} userId - User ID
	 * @returns {Promise<Array>} - Array of farm objects
	 */
	static async getOwnedFarms(userId) {
		if (!userId) {
			console.warn('No userId provided to FarmService.getOwnedFarms');
			return [];
		}

		try {
			const farmsRef = collection(db, COLLECTION_NAME);
			const q = query(farmsRef, where('ownerId', '==', userId));
			const snapshot = await getDocs(q);
			const farms = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					...data,
					createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
					updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
				};
			});
			return farms;
		} catch (error) {
			console.error('Error fetching owned farms:', error);
			return [];
		}
	}

	/**
	 * Get farm by ID (only if user is a member)
	 * @param {string} userId - User ID
	 * @param {string} id - Farm ID
	 * @returns {Promise<Object|null>} - Farm object or null
	 */
	static async getById(userId, id) {
		if (!userId || !id) {
			return null;
		}

		try {
			const farmRef = doc(db, COLLECTION_NAME, id);
			const farmDoc = await getDoc(farmRef);

			if (farmDoc.exists()) {
				const data = farmDoc.data();
				// Verify the user is a member of the farm
				if (data.memberIds && data.memberIds.includes(userId)) {
					return {
						id: farmDoc.id,
						...data,
						createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
						updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
					};
				}
			}
			return null;
		} catch (error) {
			console.error('Error fetching farm by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new farm
	 * @param {string} userId - User ID (will be set as owner)
	 * @param {Object} farmData - Farm data (name is required)
	 * @returns {Promise<Object>} - Created farm object
	 */
	static async create(userId, farmData) {
		if (!userId) {
			throw new Error('UserId is required to create a farm');
		}

		if (!farmData.name || !farmData.name.trim()) {
			throw new Error('Farm name is required');
		}

		try {
			console.log('[FarmService.create] start', { userId, farmData });
			const farmRef = doc(collection(db, COLLECTION_NAME));
			const farmDataToSave = {
				name: farmData.name.trim(),
				ownerId: userId,
				memberIds: [userId], // Owner is automatically a member
				fieldIds: [],
				createdAt: Timestamp.now(),
				updatedAt: Timestamp.now()
			};

			console.log('[FarmService.create] writing', { path: `${COLLECTION_NAME}/${farmRef.id}`, payload: { ...farmDataToSave, createdAt: '[Timestamp]', updatedAt: '[Timestamp]' } });
			await setDoc(farmRef, farmDataToSave);
			console.log('[FarmService.create] write success', { id: farmRef.id });
			return {
				id: farmRef.id,
				...farmDataToSave,
				createdAt: farmDataToSave.createdAt.toDate().toISOString(),
				updatedAt: farmDataToSave.updatedAt.toDate().toISOString()
			};
		} catch (error) {
			console.error('[FarmService.create] error', error);
			throw error;
		}
	}

	/**
	 * Update farm (only owner can update)
	 * @param {string} userId - User ID (must be owner)
	 * @param {string} id - Farm ID
	 * @param {Object} farmData - Farm data to update
	 * @returns {Promise<Object|null>} - Updated farm object or null
	 */
	static async update(userId, id, farmData) {
		if (!userId || !id) {
			throw new Error('UserId and farm ID are required to update a farm');
		}

		try {
			// Verify user is the owner
			const farm = await this.getById(userId, id);
			if (!farm || farm.ownerId !== userId) {
				throw new Error('Only the farm owner can update the farm');
			}

			const farmRef = doc(db, COLLECTION_NAME, id);
			const updateData = {
				...farmData,
				updatedAt: Timestamp.now()
			};

			// Don't allow changing ownerId or memberIds through update
			delete updateData.ownerId;
			delete updateData.memberIds;
			delete updateData.createdAt;

			await updateDoc(farmRef, updateData);
			return await this.getById(userId, id);
		} catch (error) {
			console.error('Error updating farm:', error);
			throw error;
		}
	}

	/**
	 * Delete farm (only owner can delete)
	 * @param {string} userId - User ID (must be owner)
	 * @param {string} id - Farm ID
	 * @returns {Promise<boolean>} - Success status
	 */
	static async delete(userId, id) {
		if (!userId || !id) {
			return false;
		}

		try {
			// Verify user is the owner
			const farm = await this.getById(userId, id);
			if (!farm || farm.ownerId !== userId) {
				throw new Error('Only the farm owner can delete the farm');
			}

			const farmRef = doc(db, COLLECTION_NAME, id);
			await deleteDoc(farmRef);
			return true;
		} catch (error) {
			console.error('Error deleting farm:', error);
			return false;
		}
	}

	/**
	 * Add a member to a farm (only owner can add members)
	 * @param {string} userId - User ID (must be owner)
	 * @param {string} farmId - Farm ID
	 * @param {string} memberUserId - User ID to add as member
	 * @returns {Promise<Object|null>} - Updated farm object or null
	 */
	static async addMember(userId, farmId, memberUserId) {
		if (!userId || !farmId || !memberUserId) {
			throw new Error('UserId, farmId, and memberUserId are required');
		}

		if (userId === memberUserId) {
			throw new Error('Cannot add yourself as a member (you are already the owner)');
		}

		try {
			// Verify user is the owner
			const farm = await this.getById(userId, farmId);
			if (!farm || farm.ownerId !== userId) {
				throw new Error('Only the farm owner can add members');
			}

			// Check if member is already in the farm
			if (farm.memberIds && farm.memberIds.includes(memberUserId)) {
				throw new Error('User is already a member of this farm');
			}

			const farmRef = doc(db, COLLECTION_NAME, farmId);
			await updateDoc(farmRef, {
				memberIds: arrayUnion(memberUserId),
				updatedAt: Timestamp.now()
			});

			return await this.getById(userId, farmId);
		} catch (error) {
			console.error('Error adding member to farm:', error);
			throw error;
		}
	}

	/**
	 * Remove a member from a farm (only owner can remove members, cannot remove owner)
	 * @param {string} userId - User ID (must be owner)
	 * @param {string} farmId - Farm ID
	 * @param {string} memberUserId - User ID to remove as member
	 * @returns {Promise<Object|null>} - Updated farm object or null
	 */
	static async removeMember(userId, farmId, memberUserId) {
		if (!userId || !farmId || !memberUserId) {
			throw new Error('UserId, farmId, and memberUserId are required');
		}

		if (userId === memberUserId) {
			throw new Error('Cannot remove the owner from the farm');
		}

		try {
			// Verify user is the owner
			const farm = await this.getById(userId, farmId);
			if (!farm || farm.ownerId !== userId) {
				throw new Error('Only the farm owner can remove members');
			}

			// Check if member is in the farm
			if (!farm.memberIds || !farm.memberIds.includes(memberUserId)) {
				throw new Error('User is not a member of this farm');
			}

			const farmRef = doc(db, COLLECTION_NAME, farmId);
			await updateDoc(farmRef, {
				memberIds: arrayRemove(memberUserId),
				updatedAt: Timestamp.now()
			});

			return await this.getById(userId, farmId);
		} catch (error) {
			console.error('Error removing member from farm:', error);
			throw error;
		}
	}
}
