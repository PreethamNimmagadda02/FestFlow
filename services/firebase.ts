import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getPerformance } from 'firebase/performance';
import { getStorage } from 'firebase/storage';
import { ref, deleteObject } from 'firebase/storage';

// This configuration is populated by environment variables.
// Ensure your build environment is set up to provide these values.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized yet.
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
// Initialize Firebase Performance Monitoring and get a reference to the service
export const performance = getPerformance(app);
// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);


/**
 * Deletes a file from Firebase Storage given its full URL
 * @param fileUrl The full Firebase Storage URL (e.g., https://firebasestorage.googleapis.com/...)
 */
export const deleteFileFromStorage = async (fileUrl: string): Promise<void> => {
    try {
        // Extract the storage path from the URL
        // Firebase Storage URLs are in format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
        const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/`;

        if (!fileUrl.startsWith(baseUrl)) {
            // Not a Firebase Storage URL from this project, skip deletion
            return;
        }

        // Extract and decode the path
        const encodedPath = fileUrl.substring(baseUrl.length).split('?')[0];
        const filePath = decodeURIComponent(encodedPath);

        // Delete the file
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        console.log('Successfully deleted old profile picture:', filePath);
    } catch (error: any) {
        // If file doesn't exist or other error, just log it (don't throw)
        // This prevents errors when trying to delete files that were already deleted or don't exist
        if (error.code === 'storage/object-not-found') {
            console.log('File not found (already deleted or never existed):', fileUrl);
        } else {
            console.error('Error deleting file from storage:', error);
        }
    }
};
