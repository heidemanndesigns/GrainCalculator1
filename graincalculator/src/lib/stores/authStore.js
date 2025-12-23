// @ts-nocheck
import { writable } from 'svelte/store';
import { auth } from '$lib/firebase/firebase.client';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged
} from 'firebase/auth';

// Auth store state
export const authStore = writable({
	user: null,
	loading: true,
	error: null
});

// Initialize auth state listener
if (typeof window !== 'undefined') {
	onAuthStateChanged(auth, (user) => {
		authStore.set({
			user,
			loading: false,
			error: null
		});
	});
}

export const authHandlers = {
	/**
	 * Sign up with email and password
	 * @param {string} email - User email
	 * @param {string} password - User password
	 */
	signUp: async (email, password) => {
		try {
			authStore.update((state) => ({ ...state, loading: true, error: null }));
			const result = await createUserWithEmailAndPassword(auth, email, password);
			// User state will be updated by onAuthStateChanged
			return result.user;
		} catch (error) {
			console.error('Error signing up:', error);
			let errorMessage = 'Failed to create account';
			
			// Provide user-friendly error messages
			if (error.code === 'auth/email-already-in-use') {
				errorMessage = 'This email is already registered. Please sign in instead.';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Please enter a valid email address.';
			} else if (error.code === 'auth/weak-password') {
				errorMessage = 'Password should be at least 6 characters.';
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			authStore.update((state) => ({
				...state,
				loading: false,
				error: errorMessage
			}));
			throw error;
		}
	},

	/**
	 * Sign in with email and password
	 * @param {string} email - User email
	 * @param {string} password - User password
	 */
	signIn: async (email, password) => {
		try {
			authStore.update((state) => ({ ...state, loading: true, error: null }));
			const result = await signInWithEmailAndPassword(auth, email, password);
			// User state will be updated by onAuthStateChanged
			return result.user;
		} catch (error) {
			console.error('Error signing in:', error);
			let errorMessage = 'Failed to sign in';
			
			// Provide user-friendly error messages
			if (error.code === 'auth/user-not-found') {
				errorMessage = 'No account found with this email. Please sign up first.';
			} else if (error.code === 'auth/wrong-password') {
				errorMessage = 'Incorrect password. Please try again.';
			} else if (error.code === 'auth/invalid-email') {
				errorMessage = 'Please enter a valid email address.';
			} else if (error.code === 'auth/invalid-credential') {
				errorMessage = 'Invalid email or password. Please try again.';
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			authStore.update((state) => ({
				...state,
				loading: false,
				error: errorMessage
			}));
			throw error;
		}
	},

	/**
	 * Sign out current user
	 */
	signOut: async () => {
		try {
			authStore.update((state) => ({ ...state, loading: true, error: null }));
			await signOut(auth);
			// User state will be updated by onAuthStateChanged
		} catch (error) {
			console.error('Error signing out:', error);
			authStore.update((state) => ({
				...state,
				loading: false,
				error: error.message || 'Failed to sign out'
			}));
			throw error;
		}
	}
};

