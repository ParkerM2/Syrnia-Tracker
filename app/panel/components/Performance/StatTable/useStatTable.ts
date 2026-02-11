import { useMemo } from "react";
import type { StatRow } from "../StatTable/types";

/**
 * Hook for StatTable component
 * Handles row filtering and formatting logic
 */
export const useStatTable = (rows: StatRow[]) => {
  const defaultFormat = (value: number | string): string => {
    if (typeof value === "number") {
      return value > 0 ? value.toLocaleString() : "—";
    }
    return value || "—";
  };

  // Filter and process rows
  const visibleRows = useMemo(
    () =>
      rows.filter(row => {
        if (row.showIfZero === false && (row.value === 0 || row.value === "—" || row.value === "")) {
          return false;
        }
        return true;
      }),
    [rows],
  );

  const formatRowValue = (row: StatRow): string => {
    const format = row.format || defaultFormat;
    return format(row.value);
  };

  return {
    visibleRows,
    formatRowValue,
    defaultFormat,
  };
};
