import { useItemValuesQuery } from "@app/hooks/data/useItemValuesQuery";
import { useTrackedDataMap } from "@app/hooks/data/useTrackedDataMap";
import { useUntrackedExp } from "@app/hooks/data/useUntrackedExp";
import { aggregateRows, filterRowsByRange } from "@app/utils/aggregate-rows";
import { useMemo } from "react";
import type { CalendarCellData, CalendarViewMode } from "./types";

const EMPTY_CELL: CalendarCellData = {
  hasData: false,
  totalExp: 0,
  expBySkill: {},
  skillLevels: {},
  totalDamageReceived: 0,
  totalDamageDealt: 0,
  foodUsed: 0,
  hpUsed: null,
  drops: [],
  totalDropValue: 0,
  producedItems: [],
  totalProducedValue: 0,
  netProfit: 0,
  totalFights: 0,
  totalSkillingActions: 0,
  avgExpPerHour: 0,
  timeRange: null,
};

const getVisibleRange = (viewMode: CalendarViewMode, currentDate: Date): { start: Date; end: Date } => {
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const d = currentDate.getDate();

  if (viewMode === "year") {
    return {
      start: new Date(y, 0, 1, 0, 0, 0, 0),
      end: new Date(y, 11, 31, 23, 59, 59, 999),
    };
  }
  if (viewMode === "month") {
    // Include days from previous/next months visible in the grid
    const firstOfMonth = new Date(y, m, 1);
    const dayOfWeek = firstOfMonth.getDay();
    const gridStart = new Date(y, m, 1 - dayOfWeek, 0, 0, 0, 0);
    const lastOfMonth = new Date(y, m + 1, 0);
    const endDayOfWeek = lastOfMonth.getDay();
    const gridEnd = new Date(y, m + 1, 6 - endDayOfWeek, 23, 59, 59, 999);
    return { start: gridStart, end: gridEnd };
  }
  if (viewMode === "week") {
    const dayOfWeek = currentDate.getDay();
    const weekStart = new Date(y, m, d - dayOfWeek, 0, 0, 0, 0);
    const weekEnd = new Date(y, m, d - dayOfWeek + 6, 23, 59, 59, 999);
    return { start: weekStart, end: weekEnd };
  }
  // day
  return {
    start: new Date(y, m, d, 0, 0, 0, 0),
    end: new Date(y, m, d, 23, 59, 59, 999),
  };
};

/**
 * Generate all possible cell keys for the current view to check for untracked-only cells.
 */
const generateAllCellKeys = (viewMode: CalendarViewMode, currentDate: Date): string[] => {
  if (viewMode === "year") {
    return Array.from({ length: 12 }, (_, i) => String(i));
  }
  if (viewMode === "day") {
    return Array.from({ length: 24 }, (_, i) => String(i));
  }
  // month/week: generate date keys for the visible range
  const { start, end } = getVisibleRange(viewMode, currentDate);
  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

/**
 * Compute the start/end dates for a cell key given the view mode.
 */
const getCellDateRange = (viewMode: CalendarViewMode, currentDate: Date, key: string): { start: Date; end: Date } => {
  if (viewMode === "year") {
    const month = parseInt(key, 10);
    const y = currentDate.getFullYear();
    return {
      start: new Date(y, month, 1, 0, 0, 0, 0),
      end: new Date(y, month + 1, 0, 23, 59, 59, 999),
    };
  }
  if (viewMode === "month" || viewMode === "week") {
    const [y, m, d] = key.split("-").map(Number);
    return {
      start: new Date(y, m - 1, d, 0, 0, 0, 0),
      end: new Date(y, m - 1, d, 23, 59, 59, 999),
    };
  }
  // day view: key is hour (0-23)
  const hour = parseInt(key, 10);
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const d = currentDate.getDate();
  return {
    start: new Date(y, m, d, hour, 0, 0, 0),
    end: new Date(y, m, d, hour, 59, 59, 999),
  };
};

/**
 * Builds cell data for the visible calendar grid.
 * Groups rows by cell (local timezone) and calls aggregateRows() per cell group.
 * Merges untracked exp into cell totals and sets indicator flags.
 */
export const useCalendarData = (viewMode: CalendarViewMode, currentDate: Date) => {
  const { allRows, loading } = useTrackedDataMap();
  const { itemValues } = useItemValuesQuery();
  const { getUntrackedForRange } = useUntrackedExp();

  // Map view mode to cell granularity for untracked indicator logic
  const cellGranularity = viewMode === "day" ? "hour" : viewMode === "year" ? "month" : "day";

  const cellData = useMemo(() => {
    const map = new Map<string, CalendarCellData>();
    const { start, end } = getVisibleRange(viewMode, currentDate);
    const visibleRows = filterRowsByRange(allRows, start, end);

    if (viewMode === "year") {
      // Group by month (local)
      const groups = new Map<number, typeof visibleRows>();
      visibleRows.forEach(row => {
        const month = new Date(row.timestamp).getMonth();
        const existing = groups.get(month);
        if (existing) {
          existing.push(row);
        } else {
          groups.set(month, [row]);
        }
      });
      groups.forEach((rows, month) => {
        const stats = aggregateRows(rows, itemValues);
        map.set(String(month), { ...stats, hasData: true });
      });
    } else if (viewMode === "month" || viewMode === "week") {
      // Group by date (YYYY-MM-DD, local)
      const groups = new Map<string, typeof visibleRows>();
      visibleRows.forEach(row => {
        const dt = new Date(row.timestamp);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const existing = groups.get(key);
        if (existing) {
          existing.push(row);
        } else {
          groups.set(key, [row]);
        }
      });
      groups.forEach((rows, key) => {
        const stats = aggregateRows(rows, itemValues);
        map.set(key, { ...stats, hasData: true });
      });
    } else {
      // Day view: group by hour (local)
      const groups = new Map<number, typeof visibleRows>();
      visibleRows.forEach(row => {
        const h = new Date(row.timestamp).getHours();
        const existing = groups.get(h);
        if (existing) {
          existing.push(row);
        } else {
          groups.set(h, [row]);
        }
      });
      groups.forEach((rows, hour) => {
        const stats = aggregateRows(rows, itemValues);
        map.set(String(hour), { ...stats, hasData: true });
      });
    }

    // Merge untracked exp into existing cells
    map.forEach((cell, key) => {
      const { start: cellStart, end: cellEnd } = getCellDateRange(viewMode, currentDate, key);
      const untracked = getUntrackedForRange(cellStart, cellEnd, cellGranularity);

      if (untracked.totalExp > 0) {
        cell.totalExp += untracked.totalExp;
        Object.entries(untracked.totalBySkill).forEach(([skill, exp]) => {
          cell.expBySkill[skill] = (cell.expBySkill[skill] || 0) + exp;
        });
      }

      if (untracked.indicatorRecords.length > 0) {
        cell.hasUntrackedExp = true;
        cell.untrackedRecords = untracked.indicatorRecords;
      }
    });

    // Create cells for time ranges that have untracked exp but no tracked data
    const allCellKeys = generateAllCellKeys(viewMode, currentDate);
    allCellKeys.forEach(key => {
      if (map.has(key)) return;
      const { start: cellStart, end: cellEnd } = getCellDateRange(viewMode, currentDate, key);
      const untracked = getUntrackedForRange(cellStart, cellEnd, cellGranularity);
      if (untracked.totalExp > 0) {
        map.set(key, {
          ...EMPTY_CELL,
          hasData: true,
          totalExp: untracked.totalExp,
          expBySkill: { ...untracked.totalBySkill },
          hasUntrackedExp: untracked.indicatorRecords.length > 0,
          untrackedRecords: untracked.indicatorRecords.length > 0 ? untracked.indicatorRecords : undefined,
        });
      }
    });

    return map;
  }, [viewMode, currentDate, allRows, itemValues, getUntrackedForRange, cellGranularity]);

  const getCell = (key: string): CalendarCellData => cellData.get(key) || EMPTY_CELL;

  return { cellData, getCell, loading };
};
