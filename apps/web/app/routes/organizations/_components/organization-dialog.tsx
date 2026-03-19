'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';

import type { Organization } from '@qwery/domain/entities';
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
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import { useTranslation } from 'react-i18next';

import {
  useCreateOrganization,
  useUpdateOrganization,
} from '../../../../lib/mutations/use-organization';
import { useWorkspace } from '../../../../lib/context/workspace-context';
import pathsConfig, { createPath } from '../../../../config/paths.config';
import { getErrorKey } from '~/lib/utils/error-key';

const NAME_MAX_LENGTH = 255;

const organizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or less`),
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
  const { t } = useTranslation('common');
  const { workspace, repositories } = useWorkspace();
  const navigate = useNavigate();
  const isEditing = !!organization;

  const createMutation = useCreateOrganization(repositories.organization, {
    onSuccess: (createdOrganization) => {
      toast.success('Organization created successfully');
      onOpenChange(false);
      onSuccess?.();
      if (createdOrganization?.slug) {
        const path = createPath(
          pathsConfig.app.organizationView,
          createdOrganization.slug,
        );
        navigate(path);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorKey(error, t));
    },
  });

  const updateMutation = useUpdateOrganization(repositories.organization, {
    onSuccess: () => {
      toast.success('Organization updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(getErrorKey(error, t));
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: organization?.name || '',
      });
    }
  }, [open, organization, form]);

  const onSubmit = (data: OrganizationFormData) => {
    if (isEditing && organization) {
      updateMutation.mutate({
        id: organization.id,
        name: data.name,
        updatedBy: workspace.userId,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        userId: workspace.userId,
        createdBy: workspace.userId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background w-[95vw] max-w-md gap-0 p-0 font-sans sm:rounded-lg">
        <DialogHeader className="gap-1 px-6 pt-6 pb-4">
          <DialogTitle className="text-foreground text-base font-semibold">
            {isEditing ? (
              <Trans i18nKey="organizations:edit_organization" />
            ) : (
              <Trans i18nKey="organizations:create_organization" />
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            <Trans
              i18nKey={
                isEditing
                  ? 'organizations:edit_organization_description'
                  : 'organizations:create_organization_description'
              }
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6">
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
                      placeholder={t('organizations:name_placeholder')}
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
