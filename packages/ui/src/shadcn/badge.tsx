import * as React from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '../lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-50 hover:bg-green-50 text-green-500 dark:bg-green-500/20 dark:hover:bg-green-500/20',
        warning:
          'border-transparent bg-orange-50 hover:bg-orange-50 text-orange-500 dark:bg-orange-500/20 dark:hover:bg-orange-500/20',
        info: 'border-transparent bg-blue-50 hover:bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:hover:bg-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
