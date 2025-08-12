
'use client';

import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import { useToast } from './use-toast';

// Minimal local user type (replaces Firebase User)
export type AppUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    signUp: (email: string, pass: string) => Promise<void>;
    signIn: (email: string, pass: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    logOut: () => Promise<void>;
    updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
    updateUserEmail: (email: string) => Promise<void>;
    updateUserPassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Immediately set a mock user; replace with real backend integration later
        const mockUser: AppUser = {
            uid: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: 'https://placehold.co/100x100.png',
        };
        setUser(mockUser);
        setLoading(false);
    }, []);

    const signUp = () => {
        // Stub: no-op success
        return Promise.resolve();
    };

    const signIn = (email: string) => {
        // Stub: set mock user with provided email
        setUser((prev) => ({
            uid: prev?.uid ?? 'test-user-123',
            email,
            displayName: prev?.displayName ?? 'Test User',
            photoURL: prev?.photoURL ?? 'https://placehold.co/100x100.png',
        }));
        return Promise.resolve();
    };

    const signInWithGoogle = () => {
        // Stub: simulate Google sign-in by setting a user
        setUser({
            uid: 'test-google-user-123',
            email: 'google.user@example.com',
            displayName: 'Google User',
            photoURL: 'https://placehold.co/100x100.png',
        });
        return Promise.resolve();
    }

    const sendPasswordReset = () => {
        // Stub: no-op success
        return Promise.resolve();
    }
    
    const logOut = () => {
        setUser(null);
        toast({ title: "You've been signed out." });
        return Promise.resolve();
    };
    
    const updateUserProfile = async (displayName: string, photoURL?: string) => {
        setUser(prev => prev ? { ...prev, displayName, photoURL: photoURL ?? prev.photoURL } : null);
    };
    
    const updateUserEmail = async (email: string) => {
        setUser(prev => prev ? { ...prev, email } : null);
    }
    
    const updateUserPassword = async () => {
        // Stub: just notify
        toast({ title: "Password updated (mock)" });
    }


    const value = {
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        sendPasswordReset,
        logOut,
        updateUserProfile,
        updateUserEmail,
        updateUserPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
