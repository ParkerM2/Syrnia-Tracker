import { Badge, Tabs, TabsList, TabsTrigger } from "@app/components";
import { cn } from "@app/utils/cn";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { memo } from "react";
import type { CalendarViewMode } from "./types";

interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  currentDate: Date;
  hasHistory: boolean;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onBack: () => void;
}

const formatTitle = (viewMode: CalendarViewMode, date: Date): string => {
  if (viewMode === "year") {
    return String(date.getFullYear());
  }
  if (viewMode === "month") {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (viewMode === "week") {
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    const startStr = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endStr = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${startStr} - ${endStr}, ${weekEnd.getFullYear()}`;
  }
  // day
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const CalendarToolbar = memo(
  ({ viewMode, currentDate, hasHistory, onViewModeChange, onPrev, onNext, onToday, onBack }: CalendarToolbarProps) => (
    <div className="flex flex-col gap-3">
      {/* Navigation row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasHistory && (
            <Badge as="button" type="button" onClick={onBack} className="px-2 py-1 text-xs" aria-label="Go back">
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Back
            </Badge>
          )}
          <button
            type="button"
            onClick={onPrev}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border border-border",
              "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            )}
            aria-label="Previous">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border border-border",
              "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            )}
            aria-label="Next">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-center text-sm font-semibold">{formatTitle(viewMode, currentDate)}</h2>

        <Badge as="button" type="button" onClick={onToday} className="px-2 py-1 text-xs">
          Today
        </Badge>
      </div>

      {/* View mode switcher */}
      <Tabs value={viewMode} onValueChange={v => onViewModeChange(v as CalendarViewMode)}>
        <TabsList className="h-auto p-1">
          <TabsTrigger value="year" className="px-2.5 py-1 text-xs">
            Year
          </TabsTrigger>
          <TabsTrigger value="month" className="px-2.5 py-1 text-xs">
            Month
          </TabsTrigger>
          <TabsTrigger value="week" className="px-2.5 py-1 text-xs">
            Week
          </TabsTrigger>
          <TabsTrigger value="day" className="px-2.5 py-1 text-xs">
            Day
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  ),
);

CalendarToolbar.displayName = "CalendarToolbar";

export { CalendarToolbar };
