'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';

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
import { getErrorKey } from '~/lib/utils/error-key';

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 1024;

const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or less`),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`,
    )
    .optional(),
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
  const { t } = useTranslation('common');
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
      toast.error(getErrorKey(error, t));
    },
  });

  const updateMutation = useUpdateProject(repositories.project, {
    onSuccess: () => {
      toast.success('Project updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(getErrorKey(error, t));
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
      <DialogContent className="border-border bg-background w-[95vw] max-w-md gap-0 p-0 font-sans sm:rounded-lg">
        <DialogHeader className="gap-1 px-6 pt-6 pb-4">
          <DialogTitle className="text-foreground text-base font-semibold">
            {isEditing ? (
              <Trans i18nKey="organizations:edit_project" />
            ) : (
              <Trans i18nKey="organizations:create_project" />
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            <Trans
              i18nKey={
                isEditing
                  ? 'organizations:edit_project_description'
                  : 'organizations:create_project_description'
              }
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 px-6 pb-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-sm font-medium">
                    <Trans i18nKey="organizations:name" />
                    <span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter project name"
                      disabled={isSubmitting}
                      maxLength={NAME_MAX_LENGTH}
                      className={cn(
                        'h-9 w-full',
                        form.formState.errors.name &&
                          'border-destructive focus-visible:ring-destructive',
                      )}
                      autoFocus
                    />
                  </FormControl>
                  <div className="flex items-center justify-between gap-2">
                    <FormMessage className="text-xs" />
                    <span
                      className={cn(
                        'text-muted-foreground shrink-0 text-xs tabular-nums',
                        (field.value?.length ?? 0) > NAME_MAX_LENGTH * 0.9 &&
                          'text-amber-600',
                      )}
                    >
                      {field.value?.length ?? 0} / {NAME_MAX_LENGTH}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-sm font-medium">
                    <Trans i18nKey="organizations:description" />
                    <span className="text-muted-foreground ml-1 font-normal">
                      (<Trans i18nKey="organizations:optional" />)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('organizations:description_placeholder')}
                      disabled={isSubmitting}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      rows={3}
                      className={cn(
                        'min-h-[72px] w-full resize-none',
                        form.formState.errors.description &&
                          'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between gap-2">
                    <FormMessage className="text-xs" />
                    <span
                      className={cn(
                        'text-muted-foreground shrink-0 text-xs tabular-nums',
                        (field.value?.length ?? 0) >
                          DESCRIPTION_MAX_LENGTH * 0.9 && 'text-amber-600',
                      )}
                    >
                      {field.value?.length ?? 0} / {DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9 px-4"
              >
                <Trans i18nKey="common:cancel" />
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4"
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
