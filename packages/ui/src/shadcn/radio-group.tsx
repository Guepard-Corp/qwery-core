'use client';

import * as React from 'react';

import { CheckIcon } from '@radix-ui/react-icons';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import { cn } from '../lib/utils';

const RadioGroup: React.FC<
  React.ComponentPropsWithRef<typeof RadioGroupPrimitive.Root>
> = ({ className, ...props }) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
    />
  );
};
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem: React.FC<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
> = ({ className, ...props }) => {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'border-primary text-primary focus-visible:ring-ring aspect-square h-4 w-4 rounded-full border focus:outline-hidden focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <CheckIcon className="fill-primary animate-in fade-in slide-in-from-left-4 h-3.5 w-3.5" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
};
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const RadioGroupItemLabel = (
  props: React.PropsWithChildren<{
    className?: string;
    selected?: boolean;
  }>,
) => {
  return (
    <label
      data-selected={props.selected}
      className={cn(
        props.className,
        'flex cursor-pointer rounded-md' +
          ' border-input items-center space-x-4 border' +
          'focus-within:border-primary active:bg-muted p-2.5 text-sm transition-all',
        {
          [`bg-muted/70`]: props.selected,
          [`hover:bg-muted/50`]: !props.selected,
        },
      )}
    >
      {props.children}
    </label>
  );
};
RadioGroupItemLabel.displayName = 'RadioGroupItemLabel';

export { RadioGroup, RadioGroupItem, RadioGroupItemLabel };
