
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Users, KeyRound, Bell, Link as LinkIcon, Trash2, LogOut, Camera } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


type SettingsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type NavItem = 'personal' | 'password' | 'notifications' | 'teams' | 'integration';

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { 
        user, 
        logOut, 
        updateUserProfile,
        updateUserEmail,
        updateUserPassword
    } = useAuth();
    const { toast } = useToast();

    const [activeNav, setActiveNav] = useState<NavItem>('personal');

    // State for Personal Info
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    
    // State for Email/Password
    const [email, setEmail] = useState(user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState<'profile' | 'email' | 'password' | null>(null);

    const handleUpdateProfile = async () => {
        if (!user || !displayName.trim()) return;
        setLoading('profile');
        try {
            await updateUserProfile(displayName.trim());
            toast({ title: 'Success', description: 'Your profile has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile.' });
        } finally {
            setLoading(null);
        }
    }

    const handleUpdatePassword = async () => {
         if (!user || !newPassword) return;
         if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
            return;
         }
        setLoading('password');
        try {
            await updateUserPassword(newPassword);
            toast({ title: 'Success', description: 'Your password has been updated.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            if (error instanceof FirebaseError && error.code === 'auth/requires-recent-login') {
                toast({ variant: 'destructive', title: 'Action Required', description: 'This action is sensitive and requires recent authentication. Please log out and log back in before changing your password.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not update password.' });
            }
        } finally {
            setLoading(null);
        }
    }

    const handleLogout = () => {
        onOpenChange(false);
        logOut();
    }
    
    const NavLink = ({ id, icon, label }: {id: NavItem, icon: React.ReactNode, label: string}) => (
        <Button 
            variant="ghost" 
            className={cn(
                "w-full justify-start",
                activeNav === id && "bg-accent/50 text-accent-foreground"
            )}
            onClick={() => setActiveNav(id)}
        >
            {icon}
            {label}
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex p-0">
                <aside className="w-1/4 bg-secondary/50 p-4 border-r flex flex-col">
                    <DialogHeader className="px-2 mb-4">
                        <DialogTitle className="text-lg">User profile management</DialogTitle>
                    </DialogHeader>
                    <nav className="flex flex-col gap-1">
                        <NavLink id="personal" icon={<User />} label="Personal Info" />
                        <NavLink id="password" icon={<KeyRound />} label="Emails & Password" />
                        <NavLink id="notifications" icon={<Bell />} label="Notifications" />
                        <NavLink id="teams" icon={<Users />} label="Teams" />
                        <NavLink id="integration" icon={<LinkIcon />} label="Integration" />
                    </nav>
                </aside>

                <main className="flex-1 flex flex-col overflow-y-auto">
                    <div className="p-6 flex-grow">
                        {activeNav === 'personal' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-semibold">Personal information</h2>
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback className="text-4xl">
                                                {user?.displayName?.substring(0, 1) || user?.email?.substring(0, 1) || <User />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-black/70 hover:bg-black">
                                            <Camera className="h-4 w-4 text-white"/>
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                         <p className="text-sm text-muted-foreground">Update your photo and personal details.</p>
                                          <Button variant="outline" size="sm">Upload new photo</Button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-6">
                                    <div className="space-y-2 grow basis-full">
                                        <Label htmlFor="displayName">Display Name</Label>
                                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2 grow basis-full md:basis-[calc(50%-0.75rem)]">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" value={user?.email || ''} disabled />
                                    </div>
                                    <div className="space-y-2 grow basis-full md:basis-[calc(50%-0.75rem)]">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" placeholder="+1 234 567 890" />
                                    </div>
                                    <div className="space-y-2 grow basis-full md:basis-[calc(50%-0.75rem)]">
                                        <Label htmlFor="country">Country</Label>
                                        <Input id="country" placeholder="USA" />
                                    </div>
                                    <div className="space-y-2 grow basis-full md:basis-[calc(50%-0.75rem)]">
                                        <Label htmlFor="city">City</Label>
                                        <Input id="city" placeholder="New York"/>
                                    </div>
                                    <div className="space-y-2 grow basis-full md:basis-[calc(50%-0.75rem)]">
                                        <Label htmlFor="zip">Zip Code</Label>
                                        <Input id="zip" placeholder="10001" />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
                                    <Alert variant="destructive">
                                        <AlertDescription>
                                            After making a deletion request, you will have 6 months to maintain this account. This action cannot be undone.
                                        </AlertDescription>
                                    </Alert>
                                    <Button variant="destructive" outline>Delete Account</Button>
                                </div>
                            </div>
                        )}
                        {activeNav === 'password' && (
                             <div className="space-y-8">
                                <h2 className="text-2xl font-semibold">Emails & Password</h2>
                                 <div className="space-y-4 max-w-md">
                                     <h3 className="font-semibold">Change Password</h3>
                                     <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading === 'password'}/>
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading === 'password'}/>
                                     </div>
                                     <Button onClick={handleUpdatePassword} disabled={loading === 'password' || !newPassword || !confirmPassword}>
                                        {loading === 'password' && <Loader2 className="animate-spin" />}
                                        Update Password
                                    </Button>
                                </div>
                            </div>
                        )}
                         {activeNav === 'notifications' && (
                             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold">Notifications</h3>
                                <p className="text-sm text-muted-foreground">Notification settings will be available here soon.</p>
                            </div>
                         )}
                         {activeNav === 'teams' && (
                             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold">Teams</h3>
                                <p className="text-sm text-muted-foreground">Team management is coming soon!</p>
                            </div>
                         )}
                          {activeNav === 'integration' && (
                             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold">Integrations</h3>
                                <p className="text-sm text-muted-foreground">Manage your app integrations here in the future.</p>
                            </div>
                         )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-background sticky bottom-0">
                         <Button variant="ghost" onClick={handleLogout}><LogOut />Sign Out</Button>
                         <div className="flex-grow"></div>
                         <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                         <Button onClick={handleUpdateProfile} disabled={loading === 'profile'}>
                             {loading === 'profile' && <Loader2 className="animate-spin" />}
                             Save Changes
                         </Button>
                    </DialogFooter>
                </main>
            </DialogContent>
        </Dialog>
    );
}
