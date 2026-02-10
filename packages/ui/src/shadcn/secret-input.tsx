'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';

/**
 * Password/secret input with a toggle to show or hide the value.
 * Use for fields with format password or meta secret: true.
 * @see https://www.radix-ui.com/primitives/docs/components/password-toggle-field
 */
const SecretInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    containerClassName?: string;
    toggleClassName?: string;
  }
>(({ className, containerClassName, toggleClassName, type, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const inputType = visible ? 'text' : 'password';

  return (
    <div
      className={cn(
        'border-input focus-within:ring-ring flex h-9 w-full items-center rounded-md border bg-transparent shadow-sm transition-colors focus-within:ring-1 focus-within:outline-none',
        containerClassName,
      )}
    >
      <Input
        ref={ref}
        type={inputType}
        autoComplete={props.autoComplete ?? 'current-password'}
        className={cn(
          'rounded-l-md rounded-r-none border-0 shadow-none focus-visible:ring-0',
          className,
        )}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'text-muted-foreground hover:text-foreground h-9 shrink-0 rounded-l-none rounded-r-md px-3',
          toggleClassName,
        )}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide value' : 'Show value'}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
});
SecretInput.displayName = 'SecretInput';

export { SecretInput };
