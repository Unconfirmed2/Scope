
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { FirebaseError } from 'firebase/app';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.657-11.303-8H6.306C9.656 39.663 16.318 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.816 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);


type AuthDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authAction, setAuthAction] = useState<'signIn' | 'signUp' | 'google' | 'reset'>('signIn');
    const { signUp, signIn, signInWithGoogle, sendPasswordReset } = useAuth();
    const { toast } = useToast();

    const handleAuthError = (error: any) => {
        let title = 'Authentication Failed';
        let description = "An unknown error occurred.";

        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    title = 'Email In Use';
                    description = 'This email is already associated with an account. Please try logging in.';
                    break;
                case 'auth/user-not-found':
                    title = 'User Not Found';
                    description = 'No account found with this email. Would you like to sign up?';
                    break;
                case 'auth/wrong-password':
                    title = 'Incorrect Password';
                    description = 'The password you entered is incorrect. Please try again.';
                    break;
                 case 'auth/account-exists-with-different-credential':
                    title = 'Account Conflict';
                    description = 'An account already exists with this email address, but it was created using a different sign-in method (e.g., Google). Please sign in using the original method.';
                    break;
                default:
                    description = error.message;
                    break;
            }
        }
        
        toast({ variant: 'destructive', title, description });
    }

    const handleAction = async (actionType: 'signIn' | 'signUp' | 'google' | 'reset') => {
        if (loading) return;
        setLoading(true);
        setAuthAction(actionType);

        try {
            if (actionType === 'reset') {
                if (!email) {
                    toast({ variant: 'destructive', title: 'Email Required', description: "Please enter your email to reset your password." });
                    setLoading(false);
                    return;
                }
                await sendPasswordReset(email);
                toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for instructions to reset your password.' });
                onOpenChange(false);
            } else if (actionType === 'signIn') {
                await signIn(email, password);
                toast({ title: 'Success!', description: `Welcome back!` });
                onOpenChange(false);
            } else if (actionType === 'signUp') {
                if(password !== confirmPassword) {
                    toast({ variant: 'destructive', title: 'Sign Up Failed', description: "Passwords do not match." });
                    setLoading(false);
                    return;
                }
                await signUp(email, password);
                toast({ title: 'Success!', description: `Welcome!` });
                onOpenChange(false);
            } else if (actionType === 'google') {
                await signInWithGoogle();
                toast({ title: 'Success!', description: `Welcome!` });
                onOpenChange(false);
            }

        } catch (error: any) {
            handleAuthError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                        <DialogHeader className="mb-4">
                            <DialogTitle>Welcome Back</DialogTitle>
                            <DialogDescription>Enter your credentials to access your projects.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Button variant="outline" className="w-full" onClick={() => handleAction('google')} disabled={loading}>
                                {loading && authAction === 'google' ? <Loader2 className="animate-spin" /> : <><GoogleIcon /> Sign in with Google</>}
                            </Button>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-email">Email</Label>
                                <Input id="login-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-password">Password</Label>
                                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                            </div>
                            <button onClick={() => handleAction('reset')} className="text-sm text-primary hover:underline">
                                Forgot password?
                            </button>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button className="w-full" onClick={() => handleAction('signIn')} disabled={loading}>
                                {loading && authAction === 'signIn' ? <Loader2 className="animate-spin" /> : 'Login'}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                    <TabsContent value="signup">
                        <DialogHeader className="mb-4">
                            <DialogTitle>Create an Account</DialogTitle>
                            <DialogDescription>Sign up to save your work and collaborate.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4">
                            <Button variant="outline" className="w-full" onClick={() => handleAction('google')} disabled={loading}>
                                {loading && authAction === 'google' ? <Loader2 className="animate-spin" /> : <><GoogleIcon /> Sign up with Google</>}
                            </Button>
                             <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-email">Email</Label>
                                <Input id="signup-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Password</Label>
                                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                                <Input id="signup-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button className="w-full" onClick={() => handleAction('signUp')} disabled={loading}>
                                {loading && authAction === 'signUp' ? <Loader2 className="animate-spin" /> : 'Sign Up'}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

    
