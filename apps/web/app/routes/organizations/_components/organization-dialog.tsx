'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import type { Organization } from '@qwery/domain/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@qwery/ui/dialog';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Label } from '@qwery/ui/label';
import { Textarea } from '@qwery/ui/textarea';
import { Trans } from '@qwery/ui/trans';

import { apiPost, apiPut } from '~/lib/repositories/api-client';
import { useWorkspace } from '~/lib/context/workspace-context';

const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
  onSuccess?: () => void;
}

export function OrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationDialogProps) {
  const { workspace } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!organization;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: organization?.name || '',
      });
    }
  }, [open, organization, reset]);

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && organization) {
        const response: Response = await apiPut(`/api/organizations/${organization.id}`, {
          name: data.name,
          updatedBy: workspace.userId || 'system',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update organization');
        }

        toast.success('Organization updated successfully');
      } else {
        const response: Response = await apiPost('/api/organizations', {
          name: data.name,
          userId: workspace.userId || 'system',
          createdBy: workspace.userId || 'system',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create organization');
        }

        toast.success('Organization created successfully');
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
              <Trans i18nKey="organizations:edit_organization" />
            ) : (
              <Trans i18nKey="organizations:create_organization" />
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
              placeholder={isEditing ? 'Organization name' : 'Enter organization name'}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
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

