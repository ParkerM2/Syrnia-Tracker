import PeriodBreakdownTable from "./PeriodBreakdownTable";
import PeriodSummaryCard from "./PeriodSummaryCard";
import { cn, Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger } from "@app/components";
import { useTrackedDataQuery, usePeriodStats } from "@app/hooks";
import { useCallback } from "react";
import type { TimePeriod } from "@app/types";

const TrackedHistory = () => {
  const { statsByPeriod } = useTrackedDataQuery();
  const {
    periodBreakdown,
    selectedPeriod,
    setSelectedPeriod,
    loading,
    itemValues,
    overallStats: stats,
  } = usePeriodStats("day");

  const periodStats = statsByPeriod(selectedPeriod);

  const getPeriodLabel = useCallback(
    (date: Date): string => {
      if (selectedPeriod === "hour") {
        return date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else if (selectedPeriod === "day") {
        return date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } else if (selectedPeriod === "week") {
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      } else {
        return date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
      }
    },
    [selectedPeriod],
  );

  if (loading) {
    return <div className={cn("text-lg font-semibold")}>Loading tracked data...</div>;
  }

  return (
    <div className={cn("flex w-full flex-col gap-4")}>
      {/* Time Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={value => setSelectedPeriod(value as TimePeriod)}>
        <TabsList>
          {(["hour", "day", "week", "month"] as TimePeriod[]).map(period => (
            <TabsTrigger key={period} value={period} className="capitalize">
              {period}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Statistics */}
      <PeriodSummaryCard selectedPeriod={selectedPeriod} skills={periodStats.skills} />

      {/* Period Breakdown Table */}
      <PeriodBreakdownTable
        selectedPeriod={selectedPeriod}
        periodBreakdown={periodBreakdown}
        itemValues={itemValues}
        getPeriodLabel={getPeriodLabel}
      />

      {/* All Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle>All Time Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Experience</p>
              <p className="text-2xl font-bold">{stats.totalExp.toLocaleString()}</p>
            </div>
          </div>
          {stats.timeRange.start && stats.timeRange.end && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Tracking from:{" "}
                {stats.timeRange.start.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}{" "}
                to{" "}
                {stats.timeRange.end.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackedHistory;
