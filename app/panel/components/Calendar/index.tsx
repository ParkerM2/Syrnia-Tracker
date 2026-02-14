import { CalendarToolbar } from "./CalendarToolbar";
import { useCalendar } from "./useCalendar";
import { useCalendarData } from "./useCalendarData";
import { DayView } from "./views/DayView";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";
import { YearView } from "./views/YearView";
import { Card, CardContent, CardHeader } from "@app/components";
import { memo } from "react";

const Calendar = memo(() => {
  const { viewMode, setViewMode, currentDate, viewStack, drillDown, goBack, navigatePrev, navigateNext, goToToday } =
    useCalendar();

  const { cellData, getCell, loading, overflowUntrackedRecords } = useCalendarData(viewMode, currentDate);

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading calendar data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CalendarToolbar
          viewMode={viewMode}
          currentDate={currentDate}
          hasHistory={viewStack.length > 0}
          onViewModeChange={setViewMode}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onToday={goToToday}
          onBack={goBack}
        />
      </CardHeader>
      <CardContent>
        {viewMode === "year" && <YearView currentDate={currentDate} getCell={getCell} onDrillDown={drillDown} />}
        {viewMode === "month" && (
          <MonthView currentDate={currentDate} cellData={cellData} getCell={getCell} onDrillDown={drillDown} />
        )}
        {viewMode === "week" && <WeekView currentDate={currentDate} getCell={getCell} onDrillDown={drillDown} />}
        {viewMode === "day" && (
          <DayView currentDate={currentDate} getCell={getCell} overflowUntrackedRecords={overflowUntrackedRecords} />
        )}
      </CardContent>
    </Card>
  );
});

Calendar.displayName = "Calendar";

export default Calendar;
