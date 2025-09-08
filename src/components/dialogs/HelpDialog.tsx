'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Folder, File, Bot, Zap, Pencil, BrainCircuit, RotateCw, List, Map as MapIcon, Columns } from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Help & Information</DialogTitle>
          <DialogDescription>
            Learn how to use Scope to its full potential.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Scope?</AccordionTrigger>
              <AccordionContent>
                Scope is a tool for breaking down complex goals into manageable, hierarchical scopes. Use it to plan projects, create checklists, brainstorm ideas, and more. The application leverages AI to help you generate, refine, and execute these scopes, turning high-level ideas into actionable plans.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Folders & Scopes</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p><strong className="font-semibold">Folders:</strong> ( <Folder className="inline-block" /> ) Represent high-level projects or containers for your work. You can create, rename, and sort them in the sidebar.</p>
                <p><strong className="font-semibold">Scopes:</strong> ( <File className="inline-block" /> ) Are individual tasks or ideas. They can be nested to create a hierarchy. A scope with sub-scopes acts as a parent, and its status (To Do, In Progress, Done) is automatically calculated based on its children.</p>
                <p><strong className="font-semibold">Adding Scopes:</strong> Use the main input bar at the top. Type your goal and click "Add Scope". The AI will treat it as a case study, breaking it down into a structured list of sub-scopes for you.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Using the AI</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p><strong className="font-semibold">Generate Scopes (Case Study Method):</strong> ( <Bot className="inline-block text-primary" /> ) The primary way to use the AI. Describe a goal, and the AI will act as a consultant, breaking it down into a hierarchical plan (L1, L2, L3...) and providing a synthesis.</p>
                <p><strong className="font-semibold">Execute:</strong> ( <Zap className="inline-block text-yellow-500" /> ) On any scope, use the "Execute" action to have the AI perform a deep-dive case study on the topic and provide a detailed report. Results appear in the "Execution" view.</p>
                <p><strong className="font-semibold">Rephrase Scope Title:</strong> ( <Pencil className="inline-block text-cyan-500" /> ) Refine the text of a scope without changing its children.</p>
                <p><strong className="font-semibold">Generate Sub-scopes:</strong> ( <BrainCircuit className="inline-block text-primary" /> ) Ask AI to add new sub-scopes under a scope (append).</p>
                <p><strong className="font-semibold">Regenerate Sub-scopes:</strong> ( <RotateCw className="inline-block text-blue-500" /> ) Replace all existing sub-scopes under a scope with a fresh AI-generated set.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Content Views</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p><strong className="font-semibold">List View:</strong> ( <List className="inline-block" /> ) The primary hierarchical view for managing your scopes.</p>
                <p><strong className="font-semibold">Mind Map:</strong> ( <MapIcon className="inline-block" /> ) A visual representation of your scope hierarchy, great for brainstorming and understanding relationships.</p>
                <p><strong className="font-semibold">Kanban View:</strong> ( <Columns className="inline-block" /> ) A board view organizing scopes by their status (To Do, In Progress, Done).</p>
                <p><strong className="font-semibold">Execution, Comments, Summary:</strong> These views show AI execution results, user comments, and AI-generated summaries for the selected folder or scope.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}