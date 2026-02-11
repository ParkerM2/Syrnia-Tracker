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
} from "@app/components";
import type { PeriodStats, TimePeriod } from "@app/types";
import type { CSSProperties } from "react";

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

  const values = sortedData.map(d => Number(d[valueKey]) || 0);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);

  const getIntensityStyle = (value: number): CSSProperties => {
    if (value === 0) return {};

    const isNegative = value < 0;
    const cssVar = isNegative ? "var(--destructive)" : "var(--primary)";
    const absValue = Math.abs(value);
    const referenceMax = isNegative ? Math.abs(minValue) : maxValue;
    const ratio = referenceMax > 0 ? absValue / referenceMax : 0;
    const percent = Math.round(20 + ratio * 80);

    return { backgroundColor: `color-mix(in srgb, ${cssVar} ${percent}%, transparent)` };
  };

  const getLabel = (date: Date) => {
    if (selectedPeriod === "hour") {
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (selectedPeriod === "day") {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
    } else if (selectedPeriod === "week") {
      return `Week of ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } else {
      return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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
                return (
                  <Tooltip key={item.periodKey}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-sm border text-[10px] font-semibold shadow-sm transition-all hover:scale-110",
                          value === 0 && "bg-muted",
                        )}
                        style={getIntensityStyle(value)}></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs font-bold">{getLabel(item.date)}</div>
                      <div className="text-xs">{formatter(value)}</div>
                      {/* Add extra details if needed */}
                      {valueKey === "netProfit" && (
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
