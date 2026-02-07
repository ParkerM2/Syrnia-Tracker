import { cn } from '../../utils';
import * as React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    className={cn(
      'border-input text-foreground ring-offset-background focus-visible:ring-ring',
      'flex h-10 w-full rounded-md border px-3 py-2 text-sm',
      'bg-background dark:bg-secondary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export type { SelectProps };
export { Select };
