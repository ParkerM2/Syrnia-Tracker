import { cn } from '@app/utils/cn';
import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        {
          'hover:bg-primary/80 bg-primary text-primary-foreground': variant === 'default',
          'hover:bg-destructive/80 bg-destructive text-destructive-foreground': variant === 'destructive',
          'hover:bg-card/80 border border-input bg-card hover:border-border': variant === 'outline',
          'hover:bg-secondary/70 bg-secondary text-secondary-foreground': variant === 'secondary',
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          'text-primary underline-offset-4 hover:underline': variant === 'link',
          'h-10 px-4 py-2': size === 'default',
          'h-9 rounded-md px-3': size === 'sm',
          'h-11 rounded-md px-8': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
