
'use client';

import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    type User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from './use-toast';

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signUp: (email: string, pass: string) => Promise<any>;
    signIn: (email: string, pass: string) => Promise<any>;
    signInWithGoogle: () => Promise<any>;
    sendPasswordReset: (email: string) => Promise<any>;
    logOut: () => Promise<any>;
    updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
    updateUserEmail: (email: string) => Promise<void>;
    updateUserPassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Simple flag to bypass auth for testing ---
// Set this to `false` to re-enable real Firebase authentication
const BYPASS_AUTH_FOR_TESTING = true;
// ---------------------------------------------


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (BYPASS_AUTH_FOR_TESTING) {
            const mockUser = {
                uid: 'test-user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: 'https://placehold.co/100x100.png',
                refreshToken: '',
                phoneNumber: null,
                emailVerified: true,
                isAnonymous: false,
                metadata: {},
                providerData: [],
                providerId: 'password',
                tenantId: null,
                delete: async () => {},
                getIdToken: async () => 'mock-token',
                getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, authTime: '', expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
                reload: async () => {},
                toJSON: () => ({}),
            };
            setUser(mockUser);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUp = (email: string, pass: string) => {
        if (BYPASS_AUTH_FOR_TESTING) return Promise.resolve();
        return createUserWithEmailAndPassword(auth, email, pass);
    };

    const signIn = (email: string, pass: string) => {
        if (BYPASS_AUTH_FOR_TESTING) return Promise.resolve();
        return signInWithEmailAndPassword(auth, email, pass);
    };

    const signInWithGoogle = () => {
        if (BYPASS_AUTH_FOR_TESTING) return Promise.resolve();
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    const sendPasswordReset = (email: string) => {
        if (BYPASS_AUTH_FOR_TESTING) return Promise.resolve();
        return sendPasswordResetEmail(auth, email);
    }
    
    const logOut = () => {
        if (BYPASS_AUTH_FOR_TESTING) {
            toast({ title: "Auth is bypassed.", description: "Logout does nothing in test mode." });
            return Promise.resolve();
        }
        return signOut(auth).then(() => {
            toast({ title: "You've been signed out." });
        });
    };
    
    const updateUserProfile = async (displayName: string, photoURL?: string) => {
        if (BYPASS_AUTH_FOR_TESTING) {
            setUser(prev => prev ? { ...prev, displayName, photoURL: photoURL || prev.photoURL } as User : null);
            return Promise.resolve();
        }
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName, photoURL });
            setUser({ ...auth.currentUser }); // Force state update
        }
    };
    
    const updateUserEmail = async (email: string) => {
        if (BYPASS_AUTH_FOR_TESTING) {
            setUser(prev => prev ? { ...prev, email } as User : null);
            return Promise.resolve();
        }
        if (auth.currentUser) {
            await updateEmail(auth.currentUser, email);
             setUser({ ...auth.currentUser });
        }
    }
    
    const updateUserPassword = async (password: string) => {
        if (BYPASS_AUTH_FOR_TESTING) {
             toast({ title: "Password updated (mock)" });
            return Promise.resolve();
        }
        if (auth.currentUser) {
            await updatePassword(auth.currentUser, password);
        }
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
