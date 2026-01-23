'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import type { Project } from '@qwery/domain/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@qwery/ui/dialog';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Label } from '@qwery/ui/label';
import { Textarea } from '@qwery/ui/textarea';
import { Trans } from '@qwery/ui/trans';

import { apiPost, apiPut } from '~/lib/repositories/api-client';
import { useWorkspace } from '~/lib/context/workspace-context';

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
  const { workspace } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name || '',
        description: project?.description || '',
      });
    }
  }, [open, project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && project) {
        const response: Response = await apiPut(`/api/projects/${project.id}`, {
          name: data.name,
          description: data.description,
          updatedBy: workspace.userId || 'system',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update project');
        }

        toast.success('Project updated successfully');
      } else {
        const response: Response = await apiPost('/api/projects', {
          organizationId,
          name: data.name,
          description: data.description,
          createdBy: workspace.userId || 'system',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create project');
        }

        toast.success('Project created successfully');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <Trans i18nKey="organizations:edit_project" />
            ) : (
              <Trans i18nKey="organizations:create_project" />
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              <Trans i18nKey="organizations:name" />
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={isEditing ? 'Project name' : 'Enter project name'}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              <Trans i18nKey="organizations:description" />
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter project description (optional)"
              disabled={isSubmitting}
              rows={3}
            />
            {errors.description && (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <Trans i18nKey="common:cancel" />
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Trans i18nKey="common:saving" />
              ) : isEditing ? (
                <Trans i18nKey="common:update" />
              ) : (
                <Trans i18nKey="common:create" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

