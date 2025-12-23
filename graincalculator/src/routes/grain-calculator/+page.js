import { browser } from '$app/environment';

/** @type {import('./$types').PageLoad} */
export async function load() {
	// Authentication check is handled in the component since Firebase auth is client-side only
	// The component will redirect unauthenticated users to /login
	return {};
}

