import { useCallback, useState } from "react";
import type { CalendarViewMode, ViewStackEntry } from "./types";

export const useCalendar = () => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewStack, setViewStack] = useState<ViewStackEntry[]>([]);

  const drillDown = useCallback(
    (mode: CalendarViewMode, date: Date) => {
      setViewStack(prev => [...prev, { viewMode, date: currentDate }]);
      setViewMode(mode);
      setCurrentDate(date);
    },
    [viewMode, currentDate],
  );

  const goBack = useCallback(() => {
    setViewStack(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const entry = next.pop()!;
      setViewMode(entry.viewMode);
      setCurrentDate(entry.date);
      return next;
    });
  }, []);

  const navigatePrev = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === "year") {
        d.setFullYear(d.getFullYear() - 1);
      } else if (viewMode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === "year") {
        d.setFullYear(d.getFullYear() + 1);
      } else if (viewMode === "month") {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setViewStack([]);
    setViewMode("month");
    setCurrentDate(new Date());
  }, []);

  return {
    viewMode,
    setViewMode,
    currentDate,
    viewStack,
    drillDown,
    goBack,
    navigatePrev,
    navigateNext,
    goToToday,
  };
};
