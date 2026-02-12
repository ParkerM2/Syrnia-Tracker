import { CalendarCell } from "../CalendarCell";
import { memo } from "react";
import type { CalendarCellData, CalendarViewMode } from "../types";

interface YearViewProps {
  currentDate: Date;
  getCell: (key: string) => CalendarCellData;
  onDrillDown: (mode: CalendarViewMode, date: Date) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const YearView = memo(({ currentDate, getCell, onDrillDown }: YearViewProps) => {
  const year = currentDate.getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
      {MONTH_NAMES.map((name, i) => {
        const cellData = getCell(String(i));
        const isCurrentMonth = year === currentYear && i === currentMonth;
        return (
          <CalendarCell
            key={i}
            label={name}
            data={cellData}
            isToday={isCurrentMonth}
            compact
            onClick={() => onDrillDown("month", new Date(year, i, 1))}
          />
        );
      })}
    </div>
  );
});

YearView.displayName = "YearView";

export { YearView };
