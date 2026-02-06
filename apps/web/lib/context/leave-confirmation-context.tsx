'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@qwery/ui/dialog';
import { Button } from '@qwery/ui/button';
import { useAgentStatus } from '@qwery/ui/ai';

type UnsavedCallbacks = {
  onSave: () => Promise<void>;
  onDiscard: () => void;
};

type LeaveConfirmationContextType = {
  registerUnsavedNotebook: (
    hasUnsaved: boolean,
    callbacks?: UnsavedCallbacks,
  ) => void;
};

const LeaveConfirmationContext =
  createContext<LeaveConfirmationContextType | undefined>(undefined);

export function useLeaveConfirmation() {
  const ctx = useContext(LeaveConfirmationContext);
  if (ctx === undefined) {
    return {
      registerUnsavedNotebook: () => {},
    };
  }
  return ctx;
}

export function LeaveConfirmationProvider({ children }: { children: ReactNode }) {
  const { isProcessing } = useAgentStatus();
  const [unsavedNotebook, setUnsavedNotebook] = useState<UnsavedCallbacks | null>(
    null,
  );
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const proceedRef = useRef<(() => void) | null>(null);

  const registerUnsavedNotebook = useCallback(
    (hasUnsavedFlag: boolean, callbacks?: UnsavedCallbacks) => {
      setHasUnsaved(hasUnsavedFlag);
      setUnsavedNotebook(hasUnsavedFlag && callbacks ? callbacks : null);
    },
    [],
  );

  const shouldBlock = hasUnsaved || isProcessing;

  const blocker = useBlocker(() => shouldBlock);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      proceedRef.current = blocker.proceed;
      setShowDialog(true);
    }
  }, [blocker.state, blocker.proceed]);

  const handleStay = useCallback(() => {
    setShowDialog(false);
    proceedRef.current = null;
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  const handleSaveAndLeave = useCallback(async () => {
    if (unsavedNotebook?.onSave) {
      setIsSaving(true);
      try {
        await unsavedNotebook.onSave();
      } catch {
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    setShowDialog(false);
    const proceed = proceedRef.current;
    proceedRef.current = null;
    if (proceed) proceed();
  }, [unsavedNotebook]);

  const handleDiscardAndLeave = useCallback(() => {
    unsavedNotebook?.onDiscard();
    setShowDialog(false);
    const proceed = proceedRef.current;
    proceedRef.current = null;
    if (proceed) proceed();
  }, [unsavedNotebook]);

  const handleLeaveAnyway = useCallback(() => {
    setShowDialog(false);
    const proceed = proceedRef.current;
    proceedRef.current = null;
    if (proceed) proceed();
  }, []);

  const both = hasUnsaved && isProcessing;
  const unsavedOnly = hasUnsaved && !isProcessing;
  const processingOnly = isProcessing && !hasUnsaved;

  const value = useMemo(
    () => ({ registerUnsavedNotebook }),
    [registerUnsavedNotebook],
  );

  return (
    <LeaveConfirmationContext.Provider value={value}>
      {children}
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleStay()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {both
                ? 'Unsaved changes and agent processing'
                : unsavedOnly
                  ? 'Unsaved changes'
                  : 'Agent still processing'}
            </DialogTitle>
            <DialogDescription>
              {both
                ? 'You have unsaved changes and the agent is still processing. Save and leave, discard and leave, or stay.'
                : unsavedOnly
                  ? 'You have unsaved changes. Save and continue, discard, or cancel.'
                  : 'The agent is still processing. You can leave anyway or stay.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleStay}>
              {both || unsavedOnly ? 'Cancel' : 'Stay'}
            </Button>
            {processingOnly && (
              <Button variant="destructive" onClick={handleLeaveAnyway}>
                Leave anyway
              </Button>
            )}
            {hasUnsaved && (
              <Button variant="outline" onClick={handleDiscardAndLeave}>
                {both ? 'Discard & leave' : 'Discard'}
              </Button>
            )}
            {hasUnsaved && (
              <Button
                onClick={handleSaveAndLeave}
                disabled={isSaving}
              >
                {isSaving
                  ? 'Saving...'
                  : both
                    ? 'Save & leave'
                    : 'Save & continue'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LeaveConfirmationContext.Provider>
  );
}
