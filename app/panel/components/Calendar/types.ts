import type { UntrackedExpRecord } from "@app/types";
import type { AggregatedStats } from "@app/utils/aggregate-rows";

export type CalendarViewMode = "year" | "month" | "week" | "day";

export interface CalendarCellData extends AggregatedStats {
  hasData: boolean;
  hasUntrackedExp?: boolean;
  untrackedRecords?: UntrackedExpRecord[];
}

export interface ViewStackEntry {
  viewMode: CalendarViewMode;
  date: Date;
}
