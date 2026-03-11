'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Info,
    BookOpen,
    Lightbulb,
    Keyboard,
    MessageSquareText,
    Folder,
    FileText,
    Bot,
    Zap,
    Pencil,
    BrainCircuit,
    RotateCw,
    List,
    Map as MapIcon,
    Columns,
    MessageSquare,
    BarChart3,
    ClipboardList,
    Search,
    Undo2,
    Redo2,
    Plus,
    ChevronRight,
    MousePointerClick,
    ArrowRightLeft,
} from 'lucide-react';

interface HelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Section = 'about' | 'getting-started' | 'how-to' | 'views' | 'shortcuts' | 'tips';

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
    const [activeSection, setActiveSection] = useState<Section>('about');

    const NavLink = ({ id, icon, label }: { id: Section; icon: React.ReactNode; label: string }) => (
        <Button
            variant="ghost"
            className={cn(
                'w-full justify-start',
                activeSection === id && 'bg-accent/50 text-accent-foreground'
            )}
            onClick={() => setActiveSection(id)}
        >
            {icon}
            {label}
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex p-0">
                <aside className="w-1/4 bg-secondary/50 p-4 border-r flex flex-col">
                    <DialogHeader className="px-2 mb-4">
                        <DialogTitle className="text-lg">Guide</DialogTitle>
                    </DialogHeader>
                    <nav className="flex flex-col gap-1">
                        <NavLink id="about" icon={<Info className="mr-2 h-4 w-4" />} label="About" />
                        <NavLink id="getting-started" icon={<BookOpen className="mr-2 h-4 w-4" />} label="Getting Started" />
                        <NavLink id="how-to" icon={<ClipboardList className="mr-2 h-4 w-4" />} label="How To" />
                        <NavLink id="views" icon={<Columns className="mr-2 h-4 w-4" />} label="Views" />
                        <NavLink id="shortcuts" icon={<Keyboard className="mr-2 h-4 w-4" />} label="Shortcuts" />
                        <NavLink id="tips" icon={<Lightbulb className="mr-2 h-4 w-4" />} label="Tips" />
                    </nav>
                </aside>

                <main className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-6">
                        {activeSection === 'about' && <AboutSection />}
                        {activeSection === 'getting-started' && <GettingStartedSection />}
                        {activeSection === 'how-to' && <HowToSection />}
                        {activeSection === 'views' && <ViewsSection />}
                        {activeSection === 'shortcuts' && <ShortcutsSection />}
                        {activeSection === 'tips' && <TipsSection />}
                    </ScrollArea>
                </main>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*  Section components                                                 */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-2xl font-semibold mb-1">{children}</h2>;
}

function SectionSub({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-muted-foreground mb-6">{children}</p>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>;
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {number}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1">{title}</p>
                <div className="text-sm text-muted-foreground">{children}</div>
            </div>
        </div>
    );
}

function FeatureRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{children}</p>
            </div>
        </div>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border bg-muted text-xs font-mono font-medium">
            {children}
        </kbd>
    );
}

/* ------------------------------------------------------------------ */

function AboutSection() {
    return (
        <div>
            <SectionTitle>About Scope</SectionTitle>
            <SectionSub>Scope out. Dive Deep. Complete.</SectionSub>

            <p className="text-sm mb-4">
                Scope is an AI-powered planning app that breaks down any goal, idea, or project
                into structured, actionable plans. Describe what you want to accomplish, and the AI
                generates a detailed hierarchical plan you can refine, track, and execute.
            </p>

            <SubHeading>Core Concepts</SubHeading>

            <FeatureRow icon={<Folder className="h-5 w-5 text-yellow-500" />} title="Folders">
                Top-level containers for your projects. Create folders for different areas of
                your life or work. An &quot;Unassigned&quot; folder holds scopes that haven&apos;t been
                organized yet.
            </FeatureRow>

            <FeatureRow icon={<FileText className="h-5 w-5 text-blue-500" />} title="Scopes">
                Individual tasks, ideas, or steps. Scopes nest inside each other to form a
                hierarchy &mdash; a parent scope&apos;s status automatically updates based on its children.
            </FeatureRow>

            <FeatureRow icon={<Bot className="h-5 w-5 text-primary" />} title="AI Modes">
                Four ways the AI can help: <strong>Generate</strong> a new plan,
                add <strong>Sub-scopes</strong> under an existing scope, <strong>Regenerate</strong> children
                with a fresh approach, or propose an <strong>Alternative</strong> that patches dependent items.
            </FeatureRow>

            <SubHeading>Personas</SubHeading>
            <p className="text-sm text-muted-foreground mb-3">
                Personas shape how the AI approaches your request. Pick the one that best fits your goal:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                    ['Planner', 'Itineraries, roadmaps, schedules'],
                    ['Creative Director', 'Brainstorming, concepts, mind maps'],
                    ['Operations Manager', 'Checklists, SOPs, procedures'],
                    ['Analyst', 'Market sizing, financial models'],
                    ['Educator', 'Structured lessons, explanations'],
                    ['Strategist', 'High-level strategy, KPIs'],
                    ['Writer', 'Documentation, manuals'],
                    ['Organizer', 'Timelines, action plans'],
                    ['General Assistant', 'Any request, structured outline'],
                ].map(([name, desc]) => (
                    <div key={name} className="rounded-md border p-2">
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GettingStartedSection() {
    return (
        <div>
            <SectionTitle>Getting Started</SectionTitle>
            <SectionSub>Create your first plan in three steps.</SectionSub>

            <Step number={1} title="Choose a persona">
                Select from the &quot;I want to...&quot; dropdown at the top of the page. The persona
                tells the AI how to approach your request &mdash; for example, &quot;Planner&quot; produces
                roadmaps while &quot;Analyst&quot; produces data-driven breakdowns.
            </Step>

            <Step number={2} title="Describe your goal">
                Type what you want to accomplish in the input field. Be as simple or detailed as
                you like: &quot;Plan a weekend trip to Portland&quot; or &quot;Create a 90-day onboarding
                program for new engineers.&quot; You can optionally attach an image for context.
            </Step>

            <Step number={3} title="Review and accept">
                The AI presents a proposed plan in a confirmation dialog. Review the structure,
                refine it with follow-up feedback if needed, then click <strong>&quot;Accept &amp; Add
                Scopes&quot;</strong> to add it to your folder.
            </Step>

            <Separator className="my-6" />

            <SubHeading>After you have a plan</SubHeading>
            <p className="text-sm text-muted-foreground mb-3">
                Once scopes are created, you can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>Mark scopes as <strong>To Do</strong>, <strong>In Progress</strong>, or <strong>Done</strong></li>
                <li>Right-click any scope to add sub-scopes, regenerate, or find alternatives</li>
                <li>Use the <strong>Execute</strong> action for a deep-dive AI case study on any scope</li>
                <li>Switch between views (List, Mind Map, Kanban, etc.) using the tabs</li>
                <li>Undo or redo any change with keyboard shortcuts</li>
            </ul>
        </div>
    );
}

function HowToSection() {
    return (
        <div>
            <SectionTitle>How To</SectionTitle>
            <SectionSub>Common actions and AI features.</SectionSub>

            <SubHeading>AI Actions</SubHeading>

            <FeatureRow icon={<Bot className="h-5 w-5 text-primary" />} title="Generate scopes">
                Use the main input bar. Type a goal, pick a persona, and click &quot;Add&quot;.
                The AI breaks it down into a hierarchical plan you can review before accepting.
            </FeatureRow>

            <FeatureRow icon={<BrainCircuit className="h-5 w-5 text-primary" />} title="Add sub-scopes">
                Right-click a scope and select &quot;Generate Sub-scopes.&quot; The AI adds new
                children under the selected scope without removing existing ones.
            </FeatureRow>

            <FeatureRow icon={<RotateCw className="h-5 w-5 text-blue-500" />} title="Regenerate sub-scopes">
                Right-click a scope and select &quot;Regenerate.&quot; Replaces all children with a
                fresh AI-generated set while keeping the parent scope intact.
            </FeatureRow>

            <FeatureRow icon={<ArrowRightLeft className="h-5 w-5 text-orange-500" />} title="Find alternatives">
                Right-click a scope and select &quot;Alternative.&quot; The AI replaces the scope
                with a different approach and automatically patches any dependent items
                elsewhere in the tree.
            </FeatureRow>

            <FeatureRow icon={<Pencil className="h-5 w-5 text-cyan-500" />} title="Rephrase a scope">
                Right-click and select &quot;Rephrase.&quot; The AI rewrites the scope&apos;s title
                without changing its children or structure.
            </FeatureRow>

            <FeatureRow icon={<Zap className="h-5 w-5 text-yellow-500" />} title="Execute a scope">
                Right-click and select &quot;Execute.&quot; The AI performs a deep-dive case study
                and generates a detailed report, visible in the Execution view.
            </FeatureRow>

            <Separator className="my-6" />

            <SubHeading>Managing Scopes</SubHeading>

            <FeatureRow icon={<Plus className="h-5 w-5" />} title="Add scopes manually">
                Click the &quot;+&quot; icon next to a folder or scope to add a child scope by typing
                a name directly, without using the AI.
            </FeatureRow>

            <FeatureRow icon={<MousePointerClick className="h-5 w-5" />} title="Change status">
                Click the status badge on any scope to cycle through To Do, In Progress, and Done.
                Parent scopes update their status automatically based on their children.
            </FeatureRow>

            <FeatureRow icon={<MessageSquare className="h-5 w-5" />} title="Add comments">
                Right-click a scope and select &quot;Comments&quot; to add notes, questions, or
                updates. Comments are visible in the Comments view.
            </FeatureRow>

            <FeatureRow icon={<Search className="h-5 w-5" />} title="Search">
                Press <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> (or <Kbd>Cmd</Kbd>+<Kbd>K</Kbd>) to open the search
                palette. Find any scope across all your folders instantly.
            </FeatureRow>
        </div>
    );
}

function ViewsSection() {
    return (
        <div>
            <SectionTitle>Views</SectionTitle>
            <SectionSub>Multiple ways to see and interact with your plans.</SectionSub>

            <FeatureRow icon={<List className="h-5 w-5" />} title="List View">
                Your primary workspace. A hierarchical tree where you can expand, collapse,
                reorder, and manage scopes. Right-click any row for AI and management actions.
                Badges highlight recently created or updated scopes.
            </FeatureRow>

            <FeatureRow icon={<MapIcon className="h-5 w-5" />} title="Mind Map">
                A visual branching diagram of your scope hierarchy. Great for getting
                an overview, brainstorming, or presenting your plan structure.
            </FeatureRow>

            <FeatureRow icon={<Columns className="h-5 w-5" />} title="Kanban">
                Scopes organized into three columns &mdash; <strong>To Do</strong>,{' '}
                <strong>In Progress</strong>, and <strong>Done</strong>. Useful for tracking
                workflow and spotting bottlenecks at a glance.
            </FeatureRow>

            <FeatureRow icon={<Zap className="h-5 w-5 text-yellow-500" />} title="Execution">
                A log of AI-generated deep-dive reports. Every time you &quot;Execute&quot; a scope,
                the detailed case study appears here for later reference.
            </FeatureRow>

            <FeatureRow icon={<MessageSquareText className="h-5 w-5" />} title="Comments">
                A centralized feed of all comments and replies across scopes in the
                selected folder. Stay on top of discussions in one place.
            </FeatureRow>

            <FeatureRow icon={<BarChart3 className="h-5 w-5" />} title="Summary">
                Ask the AI to generate a progress summary for a folder or scope.
                Keeps a history so you can track how your project evolves over time.
            </FeatureRow>
        </div>
    );
}

function ShortcutsSection() {
    return (
        <div>
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            <SectionSub>Work faster with these shortcuts.</SectionSub>

            <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/50">
                            <th className="text-left p-3 font-medium">Action</th>
                            <th className="text-left p-3 font-medium">Shortcut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        <tr>
                            <td className="p-3">Undo</td>
                            <td className="p-3"><Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd></td>
                        </tr>
                        <tr>
                            <td className="p-3">Redo</td>
                            <td className="p-3"><Kbd>Ctrl</Kbd> + <Kbd>Y</Kbd> or <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>Z</Kbd></td>
                        </tr>
                        <tr>
                            <td className="p-3">Search</td>
                            <td className="p-3"><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
                On macOS, use <Kbd>Cmd</Kbd> instead of <Kbd>Ctrl</Kbd>.
            </p>
        </div>
    );
}

function TipsSection() {
    return (
        <div>
            <SectionTitle>Tips</SectionTitle>
            <SectionSub>Get the most out of Scope.</SectionSub>

            <div className="space-y-4">
                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Be specific with your goals</p>
                    <p className="text-sm text-muted-foreground">
                        &quot;Plan a 3-day trip to Tokyo for two people on a $2,000 budget&quot; gives
                        much better results than &quot;plan a trip.&quot; The more context you provide,
                        the more tailored the AI&apos;s plan will be.
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Pick the right persona</p>
                    <p className="text-sm text-muted-foreground">
                        Personas dramatically change the AI&apos;s output style. Use &quot;Planner&quot; for
                        step-by-step roadmaps, &quot;Analyst&quot; for data-driven breakdowns,
                        and &quot;Creative Director&quot; for brainstorming sessions.
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Refine before accepting</p>
                    <p className="text-sm text-muted-foreground">
                        The confirmation dialog lets you give follow-up instructions before
                        committing a plan. Use this to narrow scope, change focus, or add
                        constraints like &quot;make it vegetarian&quot; or &quot;focus on low budget.&quot;
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Use Execute for deep dives</p>
                    <p className="text-sm text-muted-foreground">
                        The Execute action on any scope generates a detailed case study report.
                        Use it when you need thorough research or a comprehensive write-up on
                        a specific step in your plan.
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Try Alternatives for fresh perspectives</p>
                    <p className="text-sm text-muted-foreground">
                        If a scope doesn&apos;t feel right, use the Alternative action instead of
                        deleting and starting over. The AI replaces it with a different approach
                        and automatically updates any dependent items in your plan.
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="font-semibold text-sm mb-1">Use undo freely</p>
                    <p className="text-sm text-muted-foreground">
                        Every change is tracked in the history. Use <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> to
                        undo anything &mdash; including AI-generated changes. Check the History
                        dialog for a full timeline of your edits.
                    </p>
                </div>
            </div>
        </div>
    );
}
