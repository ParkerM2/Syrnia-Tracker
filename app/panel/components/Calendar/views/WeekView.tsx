import { CalendarCell } from "../CalendarCell";
import { memo, useMemo } from "react";
import type { CalendarCellData, CalendarViewMode } from "../types";

interface WeekViewProps {
  currentDate: Date;
  getCell: (key: string) => CalendarCellData;
  onDrillDown: (mode: CalendarViewMode, date: Date) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const WeekView = memo(({ currentDate, getCell, onDrillDown }: WeekViewProps) => {
  const days = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    const dayOfWeek = currentDate.getDay();
    const weekStart = new Date(y, m, d - dayOfWeek);

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        date,
        key,
        label: `${DAY_NAMES[i]} ${date.getDate()}`,
        isToday: key === todayKey,
      };
    });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
      {days.map(({ date, key, label, isToday }) => (
        <CalendarCell
          key={key}
          label={label}
          data={getCell(key)}
          isToday={isToday}
          onClick={() => onDrillDown("day", date)}
        />
      ))}
    </div>
  );
});

WeekView.displayName = "WeekView";

export { WeekView };
