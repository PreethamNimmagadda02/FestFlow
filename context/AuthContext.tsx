import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
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
    login: () => Promise<void>;
    logout: () => Promise<void>;
    isProfileComplete: boolean;
    completeUserProfile: (details: ProfileDetails) => Promise<void>;
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

    const login = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error(
                "Authentication failed. This might be due to an 'auth/unauthorized-domain' error. Please see the comments in 'services/firebase.ts' for instructions on how to fix this.", 
                error
            );
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

    const value = {
        currentUser,
        userProfile,
        loading,
        login,
        logout,
        isProfileComplete,
        completeUserProfile,
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
