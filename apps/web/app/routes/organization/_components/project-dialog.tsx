'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { FolderKanban, Loader2, Sparkles } from 'lucide-react';

import type { Project } from '@qwery/domain/entities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@qwery/ui/dialog';
import { Button } from '@qwery/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@qwery/ui/form';
import { Input } from '@qwery/ui/input';
import { Textarea } from '@qwery/ui/textarea';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import { useTranslation } from 'react-i18next';

import {
  useCreateProject,
  useUpdateProject,
} from '~/lib/mutations/use-project';
import { useWorkspace } from '~/lib/context/workspace-context';
import pathsConfig, { createPath } from '~/config/paths.config';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1024, 'Description is too long').optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  organizationId,
  onSuccess,
}: ProjectDialogProps) {
  const { t } = useTranslation();
  const { workspace, repositories } = useWorkspace();
  const navigate = useNavigate();
  const isEditing = !!project;

  const createMutation = useCreateProject(repositories.project, {
    onSuccess: (createdProject) => {
      toast.success('Project created successfully');
      onOpenChange(false);
      onSuccess?.();
      if (createdProject?.slug) {
        const path = createPath(pathsConfig.app.project, createdProject.slug);
        navigate(path);
      }
    },
    onError: (error: unknown) => {
      let displayMessage = 'Failed to create project';

      if (error instanceof Error) {
        const errorMessage = error.message;

        try {
          const parsed = JSON.parse(errorMessage);

          if (Array.isArray(parsed)) {
            const messages = parsed
              .map((e: unknown) => {
                if (typeof e === 'object' && e !== null) {
                  const errorObj = e as Record<string, unknown>;
                  const field = Array.isArray(errorObj.path)
                    ? errorObj.path.join('.')
                    : (errorObj.path as string) || 'field';
                  const message =
                    (errorObj.message as string) || 'Validation error';
                  return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}`;
                }
                return String(e);
              })
              .filter(Boolean);
            displayMessage =
              messages.length > 0 ? messages.join('. ') : 'Validation failed';
          } else if (typeof parsed === 'object' && parsed !== null) {
            const parsedObj = parsed as Record<string, unknown>;
            if (parsedObj.message) {
              displayMessage = parsedObj.message as string;
            } else if (parsedObj.error) {
              displayMessage = parsedObj.error as string;
            } else if (Array.isArray(parsedObj.errors)) {
              displayMessage = (parsedObj.errors as unknown[])
                .map((e: unknown) =>
                  typeof e === 'string'
                    ? e
                    : (e as Record<string, unknown>)?.message || String(e),
                )
                .filter(Boolean)
                .join(', ');
            }
          }
        } catch {
          displayMessage = errorMessage || 'Failed to create project';
        }
      } else if (typeof error === 'string') {
        try {
          const parsed = JSON.parse(error);
          if (Array.isArray(parsed)) {
            const messages = parsed
              .map((e: unknown) => {
                if (typeof e === 'object' && e !== null) {
                  const errorObj = e as Record<string, unknown>;
                  const field = Array.isArray(errorObj.path)
                    ? errorObj.path.join('.')
                    : (errorObj.path as string) || 'field';
                  const message =
                    (errorObj.message as string) || 'Validation error';
                  return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}`;
                }
                return String(e);
              })
              .filter(Boolean);
            displayMessage =
              messages.length > 0 ? messages.join('. ') : 'Validation failed';
          } else if (typeof parsed === 'object' && parsed !== null) {
            const parsedObj = parsed as Record<string, unknown>;
            displayMessage =
              (parsedObj.message as string) ||
              (parsedObj.error as string) ||
              'Failed to create project';
          } else {
            displayMessage = error;
          }
        } catch {
          displayMessage = error;
        }
      }

      toast.error(displayMessage);
    },
  });

  const updateMutation = useUpdateProject(repositories.project, {
    onSuccess: () => {
      toast.success('Project updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      let displayMessage = 'Failed to update project';

      if (error instanceof Error) {
        const errorMessage = error.message;

        try {
          const parsed = JSON.parse(errorMessage);

          if (Array.isArray(parsed)) {
            const messages = parsed
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((e: any) => {
                if (typeof e === 'object' && e !== null) {
                  const field = Array.isArray(e.path)
                    ? e.path.join('.')
                    : e.path || 'field';
                  const message = e.message || 'Validation error';
                  return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}`;
                }
                return String(e);
              })
              .filter(Boolean);
            displayMessage =
              messages.length > 0 ? messages.join('. ') : 'Validation failed';
          } else if (typeof parsed === 'object' && parsed !== null) {
            if (parsed.message) {
              displayMessage = parsed.message;
            } else if (parsed.error) {
              displayMessage = parsed.error;
            } else if (Array.isArray(parsed.errors)) {
              displayMessage = parsed.errors
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((e: any) =>
                  typeof e === 'string' ? e : e?.message || String(e),
                )
                .filter(Boolean)
                .join(', ');
            }
          }
        } catch {
          displayMessage = errorMessage || 'Failed to update project';
        }
      } else if (typeof error === 'string') {
        try {
          const parsed = JSON.parse(error);
          if (Array.isArray(parsed)) {
            const messages = parsed
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((e: any) => {
                if (typeof e === 'object' && e !== null) {
                  const field = Array.isArray(e.path)
                    ? e.path.join('.')
                    : e.path || 'field';
                  const message = e.message || 'Validation error';
                  return `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}`;
                }
                return String(e);
              })
              .filter(Boolean);
            displayMessage =
              messages.length > 0 ? messages.join('. ') : 'Validation failed';
          } else if (typeof parsed === 'object' && parsed !== null) {
            displayMessage =
              parsed.message || parsed.error || 'Failed to update project';
          } else {
            displayMessage = error;
          }
        } catch {
          displayMessage = error;
        }
      }

      toast.error(displayMessage);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name || '',
        description: project?.description || '',
      });
    }
  }, [open, project, form]);

  const onSubmit = (data: ProjectFormData) => {
    const description = data.description?.trim() || undefined;
    if (isEditing && project) {
      updateMutation.mutate({
        id: project.id,
        name: data.name,
        description,
        updatedBy: workspace.userId || 'system',
      });
    } else {
      createMutation.mutate({
        organizationId,
        name: data.name,
        description,
        createdBy: workspace.userId || 'system',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-4 pb-1">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition-all duration-200 group-hover:scale-105">
              {isEditing ? (
                <FolderKanban className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {isEditing ? (
                  <Trans i18nKey="organizations:edit_project" />
                ) : (
                  <Trans i18nKey="organizations:create_project" />
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                <Trans
                  i18nKey={
                    isEditing
                      ? 'organizations:edit_project_description'
                      : 'organizations:create_project_description'
                  }
                />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-sm font-medium">
                    <Trans i18nKey="organizations:name" />
                    <span className="text-destructive ml-1.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter project name"
                      disabled={isSubmitting}
                      className={cn(
                        'h-11 transition-all duration-200',
                        form.formState.errors.name &&
                          'border-destructive focus-visible:ring-destructive focus-visible:ring-2',
                      )}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-sm font-medium">
                    <Trans i18nKey="organizations:description" />
                    <span className="text-muted-foreground ml-1.5">
                      (<Trans i18nKey="organizations:optional" />)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('organizations:description_placeholder')}
                      disabled={isSubmitting}
                      rows={4}
                      className={cn(
                        'resize-none transition-all duration-200',
                        form.formState.errors.description &&
                          'border-destructive focus-visible:ring-destructive focus-visible:ring-2',
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-3 pt-4 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 min-w-[100px]"
              >
                <Trans i18nKey="common:cancel" />
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-w-[120px] bg-[#ffcb51] font-semibold text-black shadow-sm transition-all duration-200 hover:bg-[#ffcb51]/90 hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <Trans i18nKey="common:saving" />
                  </>
                ) : isEditing ? (
                  <Trans i18nKey="common:update" />
                ) : (
                  <Trans i18nKey="common:create" />
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
