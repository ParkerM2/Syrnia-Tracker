import ExpChart from "./ExpChart";
import { HourCard } from "./HourCard";
import { useDashboard } from "./useDashboard";
import { cn, Card, CardContent } from "@app/components";
import { memo } from "react";

/**
 * Dashboard Component
 * Pure JSX component - all logic is in useDashboard hook
 */
const Dashboard = memo(() => {
  const { loading, hasAnyData, currentHourData, previousHourData } = useDashboard();

  if (loading) {
    return <div className={cn("p-4 text-lg font-semibold")}>Loading tracked data...</div>;
  }

  if (!hasAnyData) {
    return (
      <div className={cn("flex flex-col gap-4")}>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No tracked data found.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Start playing to track your experience, drops, and stats.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6")}>
      {/* Hour Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {currentHourData && <HourCard data={currentHourData} />}
        {previousHourData && <HourCard data={previousHourData} />}
      </div>
      {/* Exp Chart - Heatmap of exp/loot */}
      <ExpChart />
    </div>
  );
});

Dashboard.displayName = "Dashboard";

export default Dashboard;
