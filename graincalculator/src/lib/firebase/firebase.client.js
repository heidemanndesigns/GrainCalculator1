import { getApp, getApps, initializeApp } from 'firebase/app';
// import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
// import { OAuthProvider } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_APIKEY,
    authDomain: import.meta.env.VITE_AUTHDOMAIN,
    projectId: import.meta.env.VITE_PROJECTID,
    storageBucket: import.meta.env.VITE_STORAGEBUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
    appId: import.meta.env.VITE_APPID
};

// Initialize Firebase (single stable instance)
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// gives us an auth parameter we can access from other files
export const auth = getAuth(firebaseApp);
// db initialization (resilient) with HMR-safe fallback if already initialized
/** @type {import('firebase/firestore').Firestore} */
let dbInstance;
try {
    dbInstance = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
        // Use new persistence API (replaces enableIndexedDbPersistence)
        localCache: persistentLocalCache({
            // Allow multi-tab persistence; avoids failed-precondition errors
            tabManager: persistentMultipleTabManager()
        })
    });
} catch {
    // If Firestore was already initialized (e.g., via HMR or previous code), reuse it
    dbInstance = getFirestore(firebaseApp);
}
export const db = dbInstance;
// Basic startup diagnostics (browser only)
if (typeof window !== 'undefined') {
    try {
        console.log('[Firebase] app initialized', {
            name: firebaseApp.name,
            projectId: firebaseApp.options?.projectId,
            authDomain: firebaseApp.options?.authDomain
        });
    } catch {
        // ignore
    }
}
// enable IndexedDB persistence (best-effort but deprecated)
// This function will be removed in a future major release.
// Instead, set FirestoreSettings.localCache to an instance of PersistentLocalCache
//  to turn on IndexedDb cache.
// Calling this function when FirestoreSettings.localCache is already
// specified will throw an exception.
// if (typeof window !== 'undefined') {
//     enableIndexedDbPersistence(db).catch(() => {
//         // ignore; falls back to memory-only
//     });
// }
// storage initialization
export const storage = getStorage(firebaseApp);
