'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Building2, Loader2, Sparkles } from 'lucide-react';

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
  const { t } = useTranslation();
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
      let displayMessage = 'Failed to create organization';

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
          displayMessage = errorMessage || 'Failed to create organization';
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
              parsed.message || parsed.error || 'Failed to create organization';
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

  const updateMutation = useUpdateOrganization(repositories.organization, {
    onSuccess: () => {
      toast.success('Organization updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      let displayMessage = 'Failed to update organization';

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
          displayMessage = errorMessage || 'Failed to update organization';
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
              parsed.message || parsed.error || 'Failed to update organization';
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-4 pb-1">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 text-primary ring-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition-all duration-200 group-hover:scale-105">
              {isEditing ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {isEditing ? (
                  <Trans i18nKey="organizations:edit_organization" />
                ) : (
                  <Trans i18nKey="organizations:create_organization" />
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                <Trans
                  i18nKey={
                    isEditing
                      ? 'organizations:edit_organization_description'
                      : 'organizations:create_organization_description'
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
                      placeholder={t('organizations:name_placeholder')}
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
