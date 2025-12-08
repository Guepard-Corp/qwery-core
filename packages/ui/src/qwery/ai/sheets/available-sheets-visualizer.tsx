import {
  FileSpreadsheetIcon,
  EyeIcon,
  TableIcon,
  ViewIcon,
  Loader2Icon,
  Trash2Icon,
  EditIcon,
  XIcon,
  CheckIcon,
  PencilIcon,
} from 'lucide-react';
import { Button } from '../../../shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../shadcn/alert-dialog';
import { Input } from '../../../shadcn/input';
import { cn } from '../../../lib/utils';
import { useState, useEffect, useRef } from 'react';

export interface AvailableSheet {
  name: string;
  type: 'view' | 'table';
}

export interface AvailableSheetsData {
  sheets: AvailableSheet[];
  message: string;
}

interface AvailableSheetsVisualizerProps {
  data: AvailableSheetsData;
  onViewSheet?: (sheetName: string) => void;
  onDeleteSheets?: (sheetNames: string[]) => void;
  onRenameSheet?: (oldSheetName: string, newSheetName: string) => void;
  isRequestInProgress?: boolean;
}

export function AvailableSheetsVisualizer({
  data,
  onViewSheet,
  onDeleteSheets,
  onRenameSheet,
  isRequestInProgress = false,
}: AvailableSheetsVisualizerProps) {
  const { sheets, message } = data;
  const [clickedSheet, setClickedSheet] = useState<string | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleViewClick = (sheetName: string) => {
    if (isRequestInProgress || clickedSheet) {
      return;
    }
    setClickedSheet(sheetName);
    onViewSheet?.(sheetName);
  };

  useEffect(() => {
    if (!isRequestInProgress && clickedSheet) {
      setClickedSheet(null);
    }
  }, [isRequestInProgress, clickedSheet]);

  const handleToggleSelection = (sheetName: string) => {
    setSelectedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(sheetName)) {
        next.delete(sheetName);
      } else {
        next.add(sheetName);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedSheets.size > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (selectedSheets.size > 0 && onDeleteSheets) {
      onDeleteSheets(Array.from(selectedSheets));
      setSelectedSheets(new Set());
      setShowDeleteConfirm(false);
      setIsEditMode(false);
    }
  };

  const handleStartEdit = (sheetName: string) => {
    setEditingSheet(sheetName);
    setEditValue(sheetName);
  };

  const handleCancelEdit = () => {
    setEditingSheet(null);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (
      editingSheet &&
      editValue.trim() &&
      editValue.trim() !== editingSheet &&
      onRenameSheet
    ) {
      onRenameSheet(editingSheet, editValue.trim());
      setEditingSheet(null);
      setEditValue('');
    }
  };

  const handleDeleteInEditMode = (sheetName: string) => {
    if (pendingDelete === sheetName) {
      // Confirm deletion
      if (onDeleteSheets) {
        onDeleteSheets([sheetName]);
        setPendingDelete(null);
      }
    } else {
      // Show confirm state
      setPendingDelete(sheetName);
    }
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  useEffect(() => {
    if (editingSheet && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSheet]);

  if (sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/30">
          <FileSpreadsheetIcon className="text-muted-foreground size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No sheets registered</p>
          <p className="text-muted-foreground text-xs">
            Register a Google Sheet to start querying and visualizing your data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} available
          </span>
          {!isEditMode && selectedSheets.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedSheets.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && onDeleteSheets && selectedSheets.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isRequestInProgress}
              className="h-7 text-xs"
            >
              <Trash2Icon className="mr-1.5 size-3" />
              Delete {selectedSheets.size}
            </Button>
          )}
          {!isEditMode && (onDeleteSheets || onRenameSheet) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditMode(true);
                setSelectedSheets(new Set());
              }}
              disabled={isRequestInProgress}
              className="h-7 text-xs"
            >
              <EditIcon className="mr-1.5 size-3" />
              Edit
            </Button>
          )}
          {isEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                setEditingSheet(null);
                setEditValue('');
                setSelectedSheets(new Set());
              }}
              className="h-7 text-xs"
            >
              <XIcon className="mr-1.5 size-3" />
              Done
            </Button>
          )}
        </div>
      </div>

      {/* Sheets List */}
      <div className="space-y-2">
        {sheets.map((sheet) => {
          const isClicked = clickedSheet === sheet.name;
          const isDisabled =
            isRequestInProgress || (clickedSheet !== null && !isClicked);
          const TypeIcon = sheet.type === 'view' ? ViewIcon : TableIcon;
          const isSelected = selectedSheets.has(sheet.name);
          const isEditing = editingSheet === sheet.name;
          const isPendingDelete = pendingDelete === sheet.name;

          return (
            <div
              key={sheet.name}
              className={cn(
                'group flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all',
                isEditMode && isSelected && 'border-destructive',
                isClicked && !isEditMode && 'border-primary',
                isPendingDelete && 'border-destructive bg-destructive/5',
                !isEditMode && !isClicked && !isPendingDelete && 'border-border',
                isDisabled && !isSelected && !isEditMode && 'opacity-60',
              )}
            >
              {/* Checkbox for selection (only in edit mode) */}
              {isEditMode && onDeleteSheets && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelection(sheet.name)}
                  disabled={isRequestInProgress}
                  className="size-4 cursor-pointer rounded border-gray-300 text-destructive focus:ring-destructive"
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isClicked && !isEditMode
                    ? 'bg-primary/10 text-primary'
                    : isSelected && isEditMode
                      ? 'bg-destructive/10 text-destructive'
                      : isPendingDelete
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted/50 text-muted-foreground',
                )}
              >
                <TypeIcon className="size-4.5" />
              </div>

              {/* Sheet Info */}
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="h-8 text-sm"
                      disabled={isRequestInProgress}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleSaveEdit}
                      disabled={
                        isRequestInProgress ||
                        !editValue.trim() ||
                        editValue.trim() === sheet.name
                      }
                    >
                      <CheckIcon className="size-4 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancelEdit}
                      disabled={isRequestInProgress}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      isClicked && !isEditMode && 'text-primary',
                      isPendingDelete && 'text-destructive',
                    )}
                  >
                    {sheet.name}
                  </span>
                )}
              </div>

              {/* Actions */}
              {isEditMode ? (
                <div className="flex items-center gap-2 shrink-0">
                  {onRenameSheet && !isPendingDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => handleStartEdit(sheet.name)}
                      disabled={isRequestInProgress || isEditing}
                    >
                      <PencilIcon className="mr-1.5 size-3.5" />
                      Rename
                    </Button>
                  )}
                  {onDeleteSheets && (
                    <>
                      {isPendingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => handleDeleteInEditMode(sheet.name)}
                            disabled={isRequestInProgress}
                          >
                            <CheckIcon className="mr-1.5 size-3.5" />
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCancelDelete}
                            disabled={isRequestInProgress}
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteInEditMode(sheet.name)}
                          disabled={isRequestInProgress}
                        >
                          <Trash2Icon className="mr-1.5 size-3.5" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                onViewSheet && (
                  <Button
                    variant={isClicked ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 shrink-0 px-4 font-medium"
                    disabled={isDisabled}
                    onClick={() => handleViewClick(sheet.name)}
                  >
                    {isClicked ? (
                      <>
                        <Loader2Icon className="mr-2 size-3.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <EyeIcon className="mr-2 size-3.5" />
                        View Sheet
                      </>
                    )}
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Sheet{selectedSheets.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSheets.size === 1 ? (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-mono font-semibold">
                    {Array.from(selectedSheets)[0]}
                  </span>
                  ? This action cannot be undone and will permanently remove the
                  sheet and all its data.
                </>
              ) : (
                <>
                  Are you sure you want to delete {selectedSheets.size} sheets?
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">Sheets to be deleted:</p>
                    <ul className="list-inside list-disc space-y-1 text-xs">
                      {Array.from(selectedSheets).map((name) => (
                        <li key={name} className="font-mono">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-2">
                    This action cannot be undone and will permanently remove
                    these sheets and all their data.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete{' '}
              {selectedSheets.size !== 1
                ? `${selectedSheets.size} sheets`
                : 'sheet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
