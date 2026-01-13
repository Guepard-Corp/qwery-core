'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../shadcn/alert-dialog';

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  itemCount?: number;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName = 'item',
  itemCount = 1,
  isLoading = false,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
}: ConfirmDeleteDialogProps) {
  const isPlural = itemCount > 1;
  const defaultTitle = title || `Delete ${isPlural ? `${itemName}s` : itemName}?`;
  const defaultDescription = description || (
    <>
      {isPlural ? (
        <>
          Are you sure you want to delete {itemCount} {itemName}s? This action
          cannot be undone and will permanently remove these {itemName}s.
        </>
      ) : (
        <>
          Are you sure you want to delete this {itemName}? This action cannot
          be undone and will permanently remove the {itemName}.
        </>
      )}
    </>
  );

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!isLoading) {
          onOpenChange(open);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>{defaultDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

