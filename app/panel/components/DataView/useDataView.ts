import { useTrackedDataQuery } from "@app/hooks";
import { useState, useMemo } from "react";

export type FilterType = "all" | "loot" | "exp" | "skilling";
export type ViewMode = "table" | "json";

export const useDataView = () => {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Use shared tracked data query - benefits from automatic cache updates
  // and listeners for storage changes
  const { allData: allRows = [], loading: isLoading, error } = useTrackedDataQuery();

  // Filter data based on selected filter
  const filteredRows = useMemo(() => {
    if (filterType === "all") {
      return allRows;
    }

    if (filterType === "loot") {
      // Show rows that have drops (loot from monsters)
      return allRows.filter(row => row.drops && row.drops.trim() !== "");
    }

    if (filterType === "exp") {
      // Show rows with gained exp > 0
      return allRows.filter(row => {
        const gainedExp = parseInt(row.gainedExp || "0", 10);
        return gainedExp > 0;
      });
    }

    if (filterType === "skilling") {
      return allRows.filter(row => row.actionType === "skilling");
    }

    return allRows;
  }, [allRows, filterType]);

  // Sort by timestamp descending (most recent first)
  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Descending order
      }),
    [filteredRows],
  );

  return {
    rows: sortedRows,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    isLoading,
    error,
    totalCount: allRows.length,
    filteredCount: sortedRows.length,
  };
};
