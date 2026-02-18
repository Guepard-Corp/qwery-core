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
import { useTranslation } from 'react-i18next';
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

const LeaveConfirmationContext = createContext<
  LeaveConfirmationContextType | undefined
>(undefined);

export function useLeaveConfirmation() {
  const ctx = useContext(LeaveConfirmationContext);
  if (ctx === undefined) {
    return {
      registerUnsavedNotebook: () => {},
    };
  }
  return ctx;
}

export function LeaveConfirmationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useTranslation('common');
  const { isProcessing } = useAgentStatus();
  const [unsavedNotebook, setUnsavedNotebook] =
    useState<UnsavedCallbacks | null>(null);
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
      setTimeout(() => {
        setShowDialog(true);
      }, 0);
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
                ? t('leaveConfirmation.titleBoth')
                : unsavedOnly
                  ? t('leaveConfirmation.titleUnsaved')
                  : t('leaveConfirmation.titleProcessing')}
            </DialogTitle>
            <DialogDescription>
              {both
                ? t('leaveConfirmation.descriptionBoth')
                : unsavedOnly
                  ? t('leaveConfirmation.descriptionUnsaved')
                  : t('leaveConfirmation.descriptionProcessing')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleStay}>
              {both || unsavedOnly
                ? t('leaveConfirmation.cancel')
                : t('leaveConfirmation.stay')}
            </Button>
            {processingOnly && (
              <Button variant="destructive" onClick={handleLeaveAnyway}>
                {t('leaveConfirmation.leaveAnyway')}
              </Button>
            )}
            {hasUnsaved && (
              <Button variant="outline" onClick={handleDiscardAndLeave}>
                {both
                  ? t('leaveConfirmation.discardAndLeave')
                  : t('leaveConfirmation.discard')}
              </Button>
            )}
            {hasUnsaved && (
              <Button onClick={handleSaveAndLeave} disabled={isSaving}>
                {isSaving
                  ? t('leaveConfirmation.saving')
                  : both
                    ? t('leaveConfirmation.saveAndLeave')
                    : t('leaveConfirmation.saveAndContinue')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LeaveConfirmationContext.Provider>
  );
}
