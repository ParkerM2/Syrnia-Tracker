import type { AggregatedStats } from "@app/utils/aggregate-rows";

export type CalendarViewMode = "year" | "month" | "week" | "day";

export interface CalendarCellData extends AggregatedStats {
  hasData: boolean;
}

export interface ViewStackEntry {
  viewMode: CalendarViewMode;
  date: Date;
}
