
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Users, KeyRound, Bell, Link as LinkIcon, LogOut, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { CLAUDE_MODELS, DEFAULT_AI_SETTINGS, type AiSettings, loadAiSettings, saveAiSettings } from '@/ai/ai-settings';


type SettingsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    aiSettings?: AiSettings;
    onAiSettingsChange?: (settings: AiSettings) => void;
}

type NavItem = 'personal' | 'password' | 'notifications' | 'teams' | 'integration' | 'ai';

export function SettingsDialog({ open, onOpenChange, aiSettings, onAiSettingsChange }: SettingsDialogProps) {
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

    // State for AI Settings (local draft)
    const [aiModel, setAiModel] = useState(aiSettings?.model || DEFAULT_AI_SETTINGS.model);
    const [aiTemperature, setAiTemperature] = useState(aiSettings?.temperature ?? DEFAULT_AI_SETTINGS.temperature);
    const [aiMaxTokens, setAiMaxTokens] = useState(aiSettings?.maxTokens ?? DEFAULT_AI_SETTINGS.maxTokens);

    // Sync when props change (e.g. dialog reopens)
    useEffect(() => {
        if (aiSettings) {
            setAiModel(aiSettings.model);
            setAiTemperature(aiSettings.temperature);
            setAiMaxTokens(aiSettings.maxTokens);
        }
    }, [aiSettings]);

    const handleSaveAiSettings = () => {
        const newSettings: AiSettings = { model: aiModel, temperature: aiTemperature, maxTokens: aiMaxTokens };
        saveAiSettings(newSettings);
        onAiSettingsChange?.(newSettings);
        toast({ title: 'AI settings saved' });
    };

    const handleResetAiSettings = () => {
        setAiModel(DEFAULT_AI_SETTINGS.model);
        setAiTemperature(DEFAULT_AI_SETTINGS.temperature);
        setAiMaxTokens(DEFAULT_AI_SETTINGS.maxTokens);
        const newSettings = { ...DEFAULT_AI_SETTINGS };
        saveAiSettings(newSettings);
        onAiSettingsChange?.(newSettings);
        toast({ title: 'AI settings reset to defaults' });
    };

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
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update password.' });
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
                        <DialogTitle className="text-lg">Settings</DialogTitle>
                    </DialogHeader>
                    <nav className="flex flex-col gap-1">
                        <NavLink id="ai" icon={<Bot />} label="AI Model" />
                        <NavLink id="personal" icon={<User />} label="Personal Info" />
                        <NavLink id="password" icon={<KeyRound />} label="Emails & Password" />
                        <NavLink id="notifications" icon={<Bell />} label="Notifications" />
                        <NavLink id="teams" icon={<Users />} label="Teams" />
                        <NavLink id="integration" icon={<LinkIcon />} label="Integration" />
                    </nav>
                </aside>

                <main className="flex-1 flex flex-col overflow-y-auto">
                    <div className="p-6 flex-grow">
                        {activeNav === 'ai' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-semibold">AI Model Settings</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure which Claude model to use and tune generation parameters. Changes apply to all future AI calls.
                                </p>

                                <div className="space-y-6 max-w-lg">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-model">Model</Label>
                                        <Select value={aiModel} onValueChange={setAiModel}>
                                            <SelectTrigger id="ai-model">
                                                <SelectValue placeholder="Select a model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CLAUDE_MODELS.map((m) => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        <div className="flex flex-col">
                                                            <span>{m.label}</span>
                                                            <span className="text-xs text-muted-foreground">{m.description}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Model ID: <code className="bg-muted px-1 rounded">{aiModel}</code>
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="ai-temperature">Temperature</Label>
                                            <span className="text-sm font-mono tabular-nums bg-muted px-2 py-0.5 rounded">{aiTemperature.toFixed(2)}</span>
                                        </div>
                                        <Slider
                                            id="ai-temperature"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={[aiTemperature]}
                                            onValueChange={([v]) => setAiTemperature(v)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Lower values produce more focused, deterministic output. Higher values increase creativity and variety.
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <Label htmlFor="ai-max-tokens">Max Output Tokens</Label>
                                        <Input
                                            id="ai-max-tokens"
                                            type="number"
                                            min={100}
                                            max={128000}
                                            step={100}
                                            value={aiMaxTokens}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value, 10);
                                                if (!isNaN(v)) setAiMaxTokens(Math.min(128000, Math.max(100, v)));
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Maximum number of tokens the model can generate per response (100 - 128,000). Higher values allow longer outputs but cost more.
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="flex gap-3">
                                        <Button onClick={handleSaveAiSettings}>
                                            Save AI Settings
                                        </Button>
                                        <Button variant="outline" onClick={handleResetAiSettings}>
                                            Reset to Defaults
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeNav === 'personal' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-semibold">Personal information</h2>
                                <div className="flex items-center gap-6">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={user?.photoURL || undefined} />
                                        <AvatarFallback className="text-4xl">
                                            {user?.displayName?.substring(0, 1) || user?.email?.substring(0, 1) || <User />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm text-muted-foreground">Update your personal details.</p>
                                </div>

                                <div className="flex flex-wrap gap-6">
                                    <div className="space-y-2 grow basis-full">
                                        <Label htmlFor="displayName">Display Name</Label>
                                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2 grow basis-full">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" value={user?.email || ''} disabled />
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
