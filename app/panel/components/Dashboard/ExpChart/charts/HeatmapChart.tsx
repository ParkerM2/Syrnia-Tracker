import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@app/components';
import type { PeriodStats, TimePeriod } from '@app/types';

interface HeatmapChartProps {
  data: PeriodStats[];
  valueKey: keyof PeriodStats;
  title: string;
  selectedPeriod: TimePeriod;
  formatter?: (value: number) => string;
}

export const HeatmapChart = ({
  data,
  valueKey,
  title,
  selectedPeriod,
  formatter = val => val.toLocaleString(),
}: HeatmapChartProps) => {
  // Sort data chronologically (oldest first)
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());

  const maxValue = Math.max(...sortedData.map(d => Number(d[valueKey]) || 0), 1);

  const getIntensityClass = (value: number) => {
    const ratio = value / maxValue;

    if (value <= 0 || maxValue <= 0) {
      if (ratio <= 0.25) return 'bg-red-500/20';
      if (ratio <= 0.5) return 'bg-red-500/40';
      if (ratio <= 0.75) return 'bg-red-500/60';
      return 'bg-red-500';
    }

    if (ratio <= 0.25) return 'bg-emerald-500/20';
    if (ratio <= 0.5) return 'bg-emerald-500/40';
    if (ratio <= 0.75) return 'bg-emerald-500/60';
    return 'bg-emerald-500';
  };

  const getLabel = (date: Date) => {
    if (selectedPeriod === 'hour') {
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (selectedPeriod === 'day') {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } else if (selectedPeriod === 'week') {
      return `Week of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            <TooltipProvider>
              {sortedData.map(item => {
                const value = Number(item[valueKey]) || 0;
                const hasValue = value > 0;
                const intensityClass = hasValue ? getIntensityClass(value) : '';
                return (
                  <Tooltip key={item.periodKey}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-sm border text-[10px] font-semibold shadow-sm transition-all hover:scale-110',
                          !hasValue && 'bg-muted/50',
                          hasValue && intensityClass,
                        )}></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs font-bold">{getLabel(item.date)}</div>
                      <div className="text-xs">{formatter(value)}</div>
                      {/* Add extra details if needed */}
                      {valueKey === 'netProfit' && (
                        <div className="text-[10px] text-muted-foreground">Drops: {item.totalDrops}</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
