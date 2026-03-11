
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import { useToast } from './use-toast';
import { updateProfile, updatePassword } from '@/app/db-actions';

// Minimal user type compatible with the rest of the app
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
    const { data: session, status, update: updateSession } = useSession();
    const [user, setUser] = useState<AppUser | null>(null);
    const loading = status === 'loading';
    const { toast } = useToast();

    useEffect(() => {
        if (session?.user) {
            setUser({
                uid: (session.user as any).id || '',
                email: session.user.email || null,
                displayName: session.user.name || null,
                photoURL: session.user.image || null,
            });
        } else {
            setUser(null);
        }
    }, [session]);

    const handleSignUp = async (email: string, pass: string) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Registration failed');
        }

        // Auto sign-in after registration
        const result = await signIn('credentials', { email, password: pass, redirect: false });
        if (result?.error) throw new Error('Sign-in failed after registration');
    };

    const handleSignIn = async (email: string, pass: string) => {
        const result = await signIn('credentials', { email, password: pass, redirect: false });
        if (result?.error) throw new Error('Invalid email or password');
    };

    const handleSignInWithGoogle = async () => {
        await signIn('google');
    };

    const handleSendPasswordReset = async (_email: string) => {
        toast({ title: 'Password reset is not yet implemented for email/password accounts.' });
    };

    const handleLogOut = async () => {
        await signOut({ redirect: false });
        setUser(null);
        toast({ title: "You've been signed out." });
    };

    const handleUpdateProfile = async (displayName: string, _photoURL?: string) => {
        const result = await updateProfile(displayName);
        if (result.success) {
            setUser(prev => prev ? { ...prev, displayName } : null);
            await updateSession();
        } else {
            throw new Error(result.error);
        }
    };

    const handleUpdateEmail = async (_email: string) => {
        toast({ title: 'Email changes are not supported yet.' });
    };

    const handleUpdatePassword = async (password: string) => {
        const result = await updatePassword(password);
        if (result.success) {
            toast({ title: 'Password updated successfully.' });
        } else {
            throw new Error(result.error);
        }
    };

    const value = {
        user,
        loading,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signInWithGoogle: handleSignInWithGoogle,
        sendPasswordReset: handleSendPasswordReset,
        logOut: handleLogOut,
        updateUserProfile: handleUpdateProfile,
        updateUserEmail: handleUpdateEmail,
        updateUserPassword: handleUpdatePassword,
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
