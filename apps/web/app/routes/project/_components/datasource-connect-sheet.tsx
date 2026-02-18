'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Datasource } from '@qwery/domain/entities';
import type { DatasourcePreviewRef } from './datasource-preview';

import { Pencil, Shuffle, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@qwery/ui/sheet';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { cn } from '@qwery/ui/utils';

import { DatasourceConnectForm } from './datasource-connect-form';
import { DatasourceDocsLink } from './datasource-docs-link';
import { DatasourcePreview } from './datasource-preview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import { generateRandomName } from '~/lib/names';
import { useGetExtension } from '~/lib/queries/use-get-extension';
import type { ExtensionDefinition } from '@qwery/extensions-sdk';

const SHEET_OVERLAY_Z = 'z-[100]';
const SHEET_CONTENT_Z = 'z-[101]';

export interface DatasourceConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionId: string;
  projectSlug: string;
  extensionMeta: ExtensionDefinition;
  onSuccess: () => void;
  onCancel: () => void;
  existingDatasource?: Datasource;
  className?: string;
}

export function DatasourceConnectSheet({
  open,
  onOpenChange,
  extensionId,
  projectSlug,
  extensionMeta,
  onSuccess,
  onCancel,
  existingDatasource,
  className,
}: DatasourceConnectSheetProps) {
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [actionsReady, setActionsReady] = useState(false);

  const [datasourceName, setDatasourceName] = useState(
    () => existingDatasource?.name ?? generateRandomName(),
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isTestConnectionLoading, setIsTestConnectionLoading] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const previewRef = useRef<DatasourcePreviewRef | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editingNameRef = useRef<string>('');
  const extension = useGetExtension(extensionId);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- sync name when sheet opens (create vs edit) */
    if (existingDatasource?.name) {
      setDatasourceName(existingDatasource.name);
    } else {
      setDatasourceName(generateRandomName());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, extensionId, existingDatasource?.name]);

  useEffect(() => {
    if (isEditingName && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = useCallback(() => {
    const trimmed = datasourceName.trim();
    if (trimmed) setDatasourceName(trimmed);
    else setDatasourceName(generateRandomName());
    setIsEditingName(false);
  }, [datasourceName]);

  const handleNameCancel = useCallback(() => {
    setDatasourceName(editingNameRef.current);
    setIsEditingName(false);
  }, []);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameSave();
      } else if (e.key === 'Escape') {
        handleNameCancel();
      }
    },
    [handleNameSave, handleNameCancel],
  );

  const handleRandomizeName = useCallback(() => {
    setDatasourceName(generateRandomName());
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    if (existingDatasource) {
      const nameChanged =
        datasourceName.trim() !== (existingDatasource.name ?? '').trim();
      const configChanged =
        formValues != null &&
        existingDatasource.config != null &&
        JSON.stringify(formValues) !==
          JSON.stringify(existingDatasource.config);
      return nameChanged || configChanged;
    }
    return (
      formValues !== null &&
      Object.values(formValues).some(
        (v) => v !== undefined && v !== null && v !== '',
      )
    );
  }, [existingDatasource, datasourceName, formValues]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowExitConfirmation(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const confirmExit = () => {
    setShowExitConfirmation(false);
    onOpenChange(false);
    onCancel();
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmation(true);
    } else {
      onCancel();
      onOpenChange(false);
    }
  };

  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          overlayClassName={SHEET_OVERLAY_Z}
          className={cn(
            'flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl',
            SHEET_CONTENT_Z,
            className,
          )}
        >
          <SheetTitle className="sr-only">
            Connect to {extensionMeta.name}
          </SheetTitle>
          <div
            className="shrink-0 space-y-3 px-4 pt-6 pr-12 pb-3"
            onMouseEnter={() => setIsHoveringName(true)}
            onMouseLeave={() => setIsHoveringName(false)}
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="bg-muted/30 flex h-20 w-20 shrink-0 items-center justify-center rounded-xl">
                {extensionMeta.icon && (
                  <img
                    src={extensionMeta.icon}
                    alt={extensionMeta.name}
                    className={cn(
                      'h-16 w-16 object-contain',
                      extensionId === 'json-online' && 'dark:invert',
                    )}
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {existingDatasource
                      ? `Edit ${extensionMeta.name} connection`
                      : `Connect to ${extensionMeta.name}`}
                  </span>
                  <DatasourceDocsLink
                    docsUrl={extension.data?.docsUrl}
                    iconOnly
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Name:
                  </span>
                  {isEditingName ? (
                    <>
                      <Input
                        ref={titleInputRef}
                        value={datasourceName}
                        onChange={(e) => setDatasourceName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={handleNameKeyDown}
                        autoComplete="off"
                        className="min-w-[120px] flex-1 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="Name..."
                      />
                      {!existingDatasource && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={handleRandomizeName}
                          aria-label="Randomize name"
                        >
                          <Shuffle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={handleNameCancel}
                        aria-label="Discard changes"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground min-w-0 truncate text-lg font-medium">
                        {datasourceName || 'Untitled datasource'}
                      </span>
                      {!existingDatasource && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className={cn(
                            'h-8 w-8 shrink-0 transition-opacity',
                            isHoveringName ? 'opacity-100' : 'opacity-0',
                          )}
                          onClick={handleRandomizeName}
                          aria-label="Randomize name"
                        >
                          <Shuffle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 shrink-0 transition-opacity',
                          isHoveringName ? 'opacity-100' : 'opacity-0',
                        )}
                        onClick={() => {
                          editingNameRef.current = datasourceName;
                          setIsEditingName(true);
                        }}
                        aria-label="Edit name"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-6">
              <div className="min-h-0 shrink-0">
                <DatasourceConnectForm
                  extensionId={extensionId}
                  projectSlug={projectSlug}
                  extensionMeta={extensionMeta}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                  formId="datasource-drawer-form"
                  showHeader={false}
                  variant="sheet"
                  actionsContainerRef={actionsRef}
                  actionsContainerReady={actionsReady}
                  datasourceName={datasourceName}
                  onDatasourceNameChange={setDatasourceName}
                  onFormValuesChange={setFormValues}
                  onTestConnectionLoadingChange={setIsTestConnectionLoading}
                  existingDatasource={existingDatasource}
                />
              </div>
              {formValues && extension.data?.supportsPreview && (
                <DatasourcePreview
                  ref={previewRef}
                  formValues={formValues}
                  extensionId={extensionId}
                  supportsPreview={extension.data?.supportsPreview}
                  isTestConnectionLoading={isTestConnectionLoading}
                  className="min-h-0 flex-1"
                />
              )}
            </div>
          </div>
          <div
            ref={(el) => {
              actionsRef.current = el;
              setActionsReady(!!el);
            }}
            className="bg-background relative z-10 shrink-0 px-4 py-4"
          />
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={showExitConfirmation}
        onOpenChange={setShowExitConfirmation}
      >
        <AlertDialogContent className="z-[110]" overlayClassName="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered connection details. Are you sure you want to
              exit? Your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exit and Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
