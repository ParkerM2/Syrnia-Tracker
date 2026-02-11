import { useItemValuesQuery } from "@app/hooks/data/useItemValuesQuery";
import { useTrackedDataMap } from "@app/hooks/data/useTrackedDataMap";
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
 * Builds cell data for the visible calendar grid.
 * Groups rows by cell (local timezone) and calls aggregateRows() per cell group.
 */
export const useCalendarData = (viewMode: CalendarViewMode, currentDate: Date) => {
  const { allRows, loading } = useTrackedDataMap();
  const { itemValues } = useItemValuesQuery();

  const cellData = useMemo(() => {
    const map = new Map<string, CalendarCellData>();
    const { start, end } = getVisibleRange(viewMode, currentDate);
    const visibleRows = filterRowsByRange(allRows, start, end);

    if (visibleRows.length === 0) return map;

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

    return map;
  }, [viewMode, currentDate, allRows, itemValues]);

  const getCell = (key: string): CalendarCellData => cellData.get(key) || EMPTY_CELL;

  return { cellData, getCell, loading };
};
