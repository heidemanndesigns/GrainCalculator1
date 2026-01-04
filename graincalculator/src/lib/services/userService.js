import { db } from '$lib/firebase/firebase.client';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	query,
	where,
	Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'Users';

/**
 * User service for managing user profiles
 * Stores user email and ID mapping for lookup
 */
export class UserService {
	/**
	 * Create or update user profile (called on signup/login)
	 * @param {string} userId - User ID
	 * @param {string} email - User email
	 * @returns {Promise<Object>} - User profile object
	 */
	static async createOrUpdate(userId, email, extra = {}) {
		if (!userId || !email) {
			throw new Error('UserId and email are required');
		}

		try {
			const userRef = doc(db, COLLECTION_NAME, userId);
			const userData = {
				email: email.toLowerCase().trim(),
				userId,
				...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)),
				updatedAt: Timestamp.now()
			};

			// Check if user exists
			const userDoc = await getDoc(userRef);
			if (!userDoc.exists()) {
				userData.createdAt = Timestamp.now();
			}

			await setDoc(userRef, userData, { merge: true });
			return { id: userId, ...userData };
		} catch (error) {
			console.error('Error creating/updating user profile:', error);
			throw error;
		}
	}
	static async update(userId, data) {
		if (!userId || !data) {
			throw new Error('UserId and data are required');
		}
		try {
			const userRef = doc(db, COLLECTION_NAME, userId);
			const updateData = {
				...data,
				updatedAt: Timestamp.now()
			};
			delete updateData.createdAt;
			// Remove undefined values (Firestore doesn't accept undefined)
			const cleaned = Object.fromEntries(
				Object.entries(updateData).filter(([, v]) => v !== undefined)
			);
			await setDoc(userRef, cleaned, { merge: true });
			const userDoc = await getDoc(userRef);
			if (userDoc.exists()) {
				const d = userDoc.data();
				return {
					id: userDoc.id,
					...d,
					createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
					updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt
				};
			}
			return null;
		} catch (error) {
			console.error('Error updating user profile:', error);
			throw error;
		}
	}

	/**
	 * Get user by ID
	 * @param {string} userId - User ID
	 * @returns {Promise<Object|null>} - User profile or null
	 */
	static async getById(userId) {
		if (!userId) {
			return null;
		}

		try {
			const userRef = doc(db, COLLECTION_NAME, userId);
			const userDoc = await getDoc(userRef);

			if (userDoc.exists()) {
				const data = userDoc.data();
				return {
					id: userDoc.id,
					...data,
					createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
					updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
				};
			}
			return null;
		} catch (error) {
			console.error('Error fetching user by ID:', error);
			return null;
		}
	}

	/**
	 * Find user by email
	 * @param {string} email - User email
	 * @returns {Promise<Object|null>} - User profile or null
	 */
	static async findByEmail(email) {
		if (!email) {
			return null;
		}

		try {
			const usersRef = collection(db, COLLECTION_NAME);
			const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
			const snapshot = await getDocs(q);

			if (!snapshot.empty) {
				const userDoc = snapshot.docs[0];
				const data = userDoc.data();
				return {
					id: userDoc.id,
					...data,
					createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
					updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
				};
			}
			return null;
		} catch (error) {
			console.error('Error finding user by email:', error);
			return null;
		}
	}
}
