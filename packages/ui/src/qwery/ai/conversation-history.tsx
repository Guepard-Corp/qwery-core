'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import {
  MessageSquare,
  MessageCircle,
  Plus,
  Pencil,
  Check,
  X,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../shadcn/alert-dialog';
import { Checkbox } from '../../shadcn/checkbox';
import {
  formatRelativeTime,
  groupConversationsByTime,
  sortTimeGroups,
  type Conversation,
} from './utils/conversation-utils';
export type { Conversation };

export interface ConversationHistoryProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  currentConversationId?: string;
  isProcessing?: boolean;
  processingConversationSlug?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onConversationEdit?: (conversationId: string, newTitle: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onConversationsDelete?: (conversationIds: string[]) => void;
}

import { ConversationList } from './conversation-list';

export function ConversationHistory(props: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        data-test="conversation-history-button"
      >
        <MessageSquare className="size-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <ConversationList
          {...props}
          onConversationSelect={(id) => {
            props.onConversationSelect?.(id);
            setOpen(false);
          }}
          onNewConversation={() => {
            props.onNewConversation?.();
            setOpen(false);
          }}
        />
      </CommandDialog>
    </>
  );
}
