import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, GithubAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, storage, deleteFileFromStorage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface ProfileDetails {
    institution: string;
    city: string;
    state: string;
    pincode: string;
}

interface AuthContextType {
    currentUser: AuthUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isProfileComplete: boolean;
    completeUserProfile: (details: ProfileDetails) => Promise<void>;
    updateUserDisplayNameAndPhoto: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
    uploadProfilePicture: (file: File) => Promise<string>;
    uploadTaskAttachment: (file: File, taskId: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                const authUser: AuthUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                };
                setCurrentUser(authUser);

                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);

                if (profile && profile.institution && profile.city && profile.state && profile.pincode) {
                    setIsProfileComplete(true);
                } else {
                    setIsProfileComplete(false);
                    if (!profile) {
                        await updateUserProfile(user.uid, {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                        });
                    }
                }
            } else {
                setCurrentUser(null);
                setUserProfile(null);
                setIsProfileComplete(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    /**
     * Handles authentication errors by logging them and re-throwing them.
     * Re-throwing the error is crucial as it allows the calling UI component
     * (e.g., a login form) to catch the error and display a specific,
     * user-friendly message based on the Firebase error code.
     * @param error The original error object from Firebase.
     * @param method The authentication method that failed (e.g., 'Google', 'Email').
     */
    const handleError = (error: any, method: string) => {
        console.error(
            `Authentication failed with ${method}. This might be due to an 'auth/unauthorized-domain' error for social providers. Please see the comments in 'services/firebase.ts' for instructions on how to fix this.`, 
            error
        );
        // Re-throw the error so the UI layer can handle it.
        throw error;
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            handleError(error, 'Google');
        }
    };
    
    const signInWithGitHub = async () => {
        try {
            const provider = new GithubAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            handleError(error, 'GitHub');
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            handleError(error, 'Email Signup');
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            handleError(error, 'Email Signin');
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error during sign-out:", error);
        }
    };

    const completeUserProfile = async (details: ProfileDetails) => {
        if (!currentUser) throw new Error("No user is logged in.");
        const newProfileData = { ...userProfile, ...details };
        await updateUserProfile(currentUser.uid, newProfileData);
        setUserProfile(newProfileData as UserProfile);
        setIsProfileComplete(true);
    };

     const updateUserDisplayNameAndPhoto = async (data: { displayName?: string; photoURL?: string }) => {
        if (!currentUser || !auth.currentUser) throw new Error("No user is logged in.");

        const updates: { displayName?: string; photoURL?: string } = {};
        if (data.displayName && data.displayName.trim() !== currentUser.displayName) {
            updates.displayName = data.displayName.trim();
        }
        if (data.photoURL && data.photoURL.trim() !== currentUser.photoURL) {
            updates.photoURL = data.photoURL.trim();
        }

        if (Object.keys(updates).length === 0) return;

        // 1. Update Firebase Auth profile
        await updateProfile(auth.currentUser, updates);

        // 2. Update Firestore profile
        await updateUserProfile(currentUser.uid, updates);

        // 3. Update local state to reflect changes immediately
        const updatedAuthUser = { ...currentUser, ...updates };
        const updatedUserProfile = { ...userProfile, ...updates } as UserProfile;
        
        setCurrentUser(updatedAuthUser);
        setUserProfile(updatedUserProfile);
    };

    const uploadProfilePicture = async (file: File): Promise<string> => {
        if (!currentUser) throw new Error("No user is logged in.");

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            throw new Error('File size too large. Please upload an image smaller than 5MB.');
        }

        // Delete the old profile picture if it exists and is stored in our Firebase Storage
        const oldPhotoURL = currentUser.photoURL;
        if (oldPhotoURL && oldPhotoURL.includes('firebasestorage.googleapis.com')) {
            await deleteFileFromStorage(oldPhotoURL);
        }

        // Create a unique file name
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile_pictures/${currentUser.uid}/${timestamp}.${fileExtension}`;

        // Upload to Firebase Storage
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    };

    const uploadTaskAttachment = async (file: File, taskId: string): Promise<string> => {
        if (!currentUser) throw new Error("No user is logged in.");

        // Validate file size (max 10MB for attachments)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            throw new Error('File size too large. Please upload a file smaller than 10MB.');
        }

        // Create a unique file name
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `task_attachments/${currentUser.uid}/${taskId}/${timestamp}_${sanitizedFileName}`;

        // Upload to Firebase Storage
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    };

    const value = {
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithGitHub,
        signUpWithEmail,
        signInWithEmail,
        logout,
        isProfileComplete,
        completeUserProfile,
        updateUserDisplayNameAndPhoto,
        uploadProfilePicture,
        uploadTaskAttachment,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
