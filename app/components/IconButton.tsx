import { Button } from './ui/button';
import { cn } from '../utils';
import * as React from 'react';
import type { ButtonProps } from './ui/button';

type IconButtonProps = {
  onClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  variant: ButtonProps['variant'];
  size: ButtonProps['size'];
  label: string;
  className: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  disabled?: boolean;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>['type'];
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ onClick, variant, size, label, className, Icon, disabled, type = 'button' }, ref) => (
    <Button
      ref={ref}
      onClick={onClick}
      variant={variant}
      size={size}
      className={className}
      aria-label={label}
      title={label}
      disabled={disabled}
      type={type}>
      <Icon className={cn('h-4 w-4', size === 'lg' && 'h-5 w-5')} aria-hidden="true" />
    </Button>
  ),
);

IconButton.displayName = 'IconButton';

export { IconButton };
export type { IconButtonProps };
