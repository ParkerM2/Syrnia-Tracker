import { CalendarCell } from "../CalendarCell";
import { memo, useMemo } from "react";
import type { CalendarCellData, CalendarViewMode } from "../types";

interface MonthViewProps {
  currentDate: Date;
  cellData: Map<string, CalendarCellData>;
  getCell: (key: string) => CalendarCellData;
  onDrillDown: (mode: CalendarViewMode, date: Date) => void;
}

interface DayCellInfo {
  date: Date;
  day: number;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const MonthView = memo(({ currentDate, getCell, onDrillDown }: MonthViewProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: DayCellInfo[] = [];

    // Fill in previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateObj = new Date(year, month - 1, d);
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: dateObj, day: d, key, isCurrentMonth: false, isToday: key === todayKey });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: dateObj, day: d, key, isCurrentMonth: true, isToday: key === todayKey });
    }

    // Next month (fill to complete last row)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const dateObj = new Date(year, month + 1, d);
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        cells.push({ date: dateObj, day: d, key, isCurrentMonth: false, isToday: key === todayKey });
      }
    }

    return cells;
  }, [year, month]);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
      {days.map(({ date, day, key, isCurrentMonth, isToday }) => (
        <CalendarCell
          key={key}
          label={String(day)}
          data={getCell(key)}
          isToday={isToday}
          isMuted={!isCurrentMonth}
          onClick={() => onDrillDown("day", date)}
        />
      ))}
    </div>
  );
});

MonthView.displayName = "MonthView";

export { MonthView };
