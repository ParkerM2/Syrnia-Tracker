import { cn } from "@app/utils/cn";
import { formatExp } from "@app/utils/formatting";
import { memo } from "react";
import type { CalendarCellData } from "./types";

interface CalendarCellProps {
  label: string;
  data: CalendarCellData;
  isToday?: boolean;
  isMuted?: boolean;
  onClick?: () => void;
}

const formatGP = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Compute background opacity (0–25%) based on totalExp relative to a reasonable threshold.
 */
const getIntensityClass = (totalExp: number): string => {
  if (totalExp <= 0) return "";
  if (totalExp < 500) return "bg-primary/5";
  if (totalExp < 2000) return "bg-primary/10";
  if (totalExp < 10000) return "bg-primary/15";
  if (totalExp < 50000) return "bg-primary/20";
  return "bg-primary/25";
};

const CalendarCell = memo(({ label, data, isToday = false, isMuted = false, onClick }: CalendarCellProps) => {
  const hasData = data.hasData;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex aspect-square flex-col items-start overflow-hidden rounded-md border p-1.5 text-left transition-colors",
        onClick && "hover:border-primary/50 cursor-pointer",
        !onClick && "cursor-default",
        isToday && "ring-2 ring-primary",
        isMuted && "opacity-40",
        hasData ? getIntensityClass(data.totalExp) : "border-border/50",
        !hasData && !isMuted && "border-border/30",
      )}>
      <span
        className={cn(
          "text-xs font-medium",
          isToday ? "text-primary" : isMuted ? "text-muted-foreground" : "text-foreground",
        )}>
        {label}
      </span>

      {hasData && (
        <div className="mt-0.5 flex w-full flex-col gap-0.5 text-[10px]">
          <span className="truncate font-semibold text-foreground">{formatExp(data.totalExp)} xp</span>
          {data.avgExpPerHour > 0 && (
            <span className="truncate text-muted-foreground">{formatExp(Math.round(data.avgExpPerHour))}/hr</span>
          )}
          {data.netProfit !== 0 && (
            <span className={cn("truncate", data.netProfit > 0 ? "text-primary" : "text-destructive")}>
              {data.netProfit > 0 ? "+" : ""}
              {formatGP(data.netProfit)} gp
            </span>
          )}
          {data.foodUsed > 0 && <span className="truncate text-muted-foreground">Food: {formatGP(data.foodUsed)}</span>}
        </div>
      )}
    </button>
  );
});

CalendarCell.displayName = "CalendarCell";

export { CalendarCell };
