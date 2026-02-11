import { useTrackedDataQuery } from "./useTrackedDataQuery";
import { deduplicateRows, filterRowsByRange } from "@app/utils/aggregate-rows";
import { useMemo } from "react";
import type { CSVRow } from "@app/utils/csv-tracker";

/**
 * Centralized deduplicated data map hook.
 * Wraps useTrackedDataQuery and provides a single source of deduplicated data.
 */
export const useTrackedDataMap = () => {
  const { allData, loading } = useTrackedDataQuery();

  const deduplicated = useMemo(() => deduplicateRows(allData), [allData]);

  const dataMap = useMemo(() => {
    const map = new Map<string, CSVRow[]>();
    deduplicated.forEach(row => {
      const ts = new Date(row.timestamp);
      // Round to second precision
      const key = new Date(
        ts.getFullYear(),
        ts.getMonth(),
        ts.getDate(),
        ts.getHours(),
        ts.getMinutes(),
        ts.getSeconds(),
      ).toISOString();
      const existing = map.get(key);
      if (existing) {
        existing.push(row);
      } else {
        map.set(key, [row]);
      }
    });
    return map;
  }, [deduplicated]);

  const getRowsInRange = useMemo(
    () => (start: Date, end: Date) => filterRowsByRange(deduplicated, start, end),
    [deduplicated],
  );

  const getRowsForHour = useMemo(
    () =>
      (hour: number, date?: Date): CSVRow[] => {
        const ref = date || new Date();
        const y = ref.getUTCFullYear();
        const m = ref.getUTCMonth();
        const d = ref.getUTCDate();
        const start = new Date(Date.UTC(y, m, d, hour, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, d, hour, 59, 59, 999));
        return filterRowsByRange(deduplicated, start, end);
      },
    [deduplicated],
  );

  const getRowsForDay = useMemo(
    () =>
      (date: Date): CSVRow[] => {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth();
        const d = date.getUTCDate();
        const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
        return filterRowsByRange(deduplicated, start, end);
      },
    [deduplicated],
  );

  return {
    dataMap,
    allRows: deduplicated,
    loading,
    getRowsInRange,
    getRowsForHour,
    getRowsForDay,
  };
};
