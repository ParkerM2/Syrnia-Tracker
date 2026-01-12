import { cn } from '../../utils.js';
import * as React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full', className)}
        style={{ backgroundColor: 'hsl(var(--secondary))' }}
        {...props}>
        <div
          className={cn('h-full transition-all', percentage > 0 && 'min-w-[2px]')}
          style={{
            width: `${percentage}%`,
            backgroundColor: 'hsl(var(--primary))',
          }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    );
  },
);

Progress.displayName = 'Progress';

export { Progress };
export type { ProgressProps };
