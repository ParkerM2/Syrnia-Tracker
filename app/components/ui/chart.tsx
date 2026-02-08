import { cn } from '@app/utils/cn';
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';

// Format: { THEME_NAME: { CSS_SELECTOR: CSS_VALUE } }
type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<string, { color?: string }> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

const useChart = () => {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a ChartContainer');
  }

  return context;
};

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
    className?: string;
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          'flex aspect-video min-w-0 justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid-horizontal_line]:stroke-border [&_.recharts-cartesian-grid-vertical_line]:stroke-border [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-wrapper]:outline-none [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke="#fff"]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        style={{ minWidth: 0, minHeight: 0 }}
        {...props}>
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
      active?: boolean;
      payload?: Payload<number | string, string>[];
      label?: string | number;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    // Deduplicate payload items by dataKey to prevent showing the same skill multiple times
    // This happens when charts have both Area and Line components for the same dataKey
    // Must be called before early return to maintain consistent hook order
    const uniquePayload = React.useMemo(() => {
      if (!payload?.length) {
        return [];
      }
      const seen = new Map<string, Payload<number | string, string>>();
      payload.forEach((item: Payload<number | string, string>) => {
        const dataKeyStr = typeof item.dataKey === 'string' ? item.dataKey : String(item.dataKey || '');
        const key = dataKeyStr || String(item.name || '');

        // Keep the first occurrence, or the one with a non-zero value if current is zero
        if (!seen.has(key)) {
          seen.set(key, item);
        } else {
          const existing = seen.get(key)!;
          const existingValue = typeof existing.value === 'number' ? existing.value : 0;
          const currentValue = typeof item.value === 'number' ? item.value : 0;
          // Prefer non-zero values, or keep existing if both are zero/non-zero
          if (currentValue !== 0 && existingValue === 0) {
            seen.set(key, item);
          }
        }
      });
      return Array.from(seen.values());
    }, [payload]);

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const dataKeyStr = typeof item.dataKey === 'string' ? item.dataKey : String(item.dataKey);
      const key = `${labelKey || dataKeyStr || item.name || 'value'}`;
      const itemConfig = config?.[key];
      const value = !labelKey && typeof label === 'string' ? config?.[label]?.label || label : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value as string, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = uniquePayload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md',
          className,
        )}>
        {!nestLabel ? tooltipLabel : null}
        <div className={cn('grid gap-1.5', nestLabel ? 'grid-cols-[1fr,auto]' : 'grid-cols-[auto,1fr,auto]')}>
          {uniquePayload.map((item: Payload<number | string, string>, index: number) => {
            const dataKeyStr = typeof item.dataKey === 'string' ? item.dataKey : String(item.dataKey || '');
            const key = `${nameKey || item.name || dataKeyStr || 'value'}`;
            const itemConfig = config?.[key];
            const indicatorColor = color || ((item.payload as Record<string, unknown>)?.fill as string) || item.color;
            // Use a stable key that combines dataKey and index to ensure uniqueness
            const stableKey = `${dataKeyStr || item.name || 'item'}-${index}`;

            return (
              <React.Fragment key={stableKey}>
                {!nestLabel && !hideIndicator ? (
                  <div
                    className={cn('shrink-0 rounded-[2px] border-[--color] bg-[--color]', {
                      'h-2.5 w-2.5': indicator === 'dot',
                      'w-1': indicator === 'line',
                      'w-1 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                    })}
                    style={
                      {
                        '--color': indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                ) : null}
                {nestLabel && !hideLabel ? (
                  <div className={cn('font-medium', labelClassName)}>
                    {labelFormatter
                      ? labelFormatter(`${itemConfig?.label || item.name || dataKeyStr || 'Value'}`, uniquePayload)
                      : itemConfig?.label || item.name || dataKeyStr}
                  </div>
                ) : null}
                <span className={cn('text-muted-foreground', nestLabel ? 'text-right' : '')}>
                  {itemConfig?.label || item.name || dataKeyStr}
                </span>
                {formatter ? (
                  formatter(item.value, item.name, item, item.payload, item.payload)
                ) : (
                  <span
                    className={cn('font-mono font-medium tabular-nums text-foreground', nestLabel ? 'text-right' : '')}>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = 'ChartTooltip';

export type { ChartConfig };
export { ChartContainer, ChartTooltip, ChartTooltipContent };
