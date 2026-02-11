import {
  cn,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@app/components";
import { useTrackedDataQuery, usePeriodStats } from "@app/hooks";
import React, { useState } from "react";
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

  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());

  const periodStats = statsByPeriod(selectedPeriod);

  const togglePeriod = (periodKey: string) => {
    setExpandedHours(prev => {
      const next = new Set(prev);
      if (next.has(periodKey)) {
        next.delete(periodKey);
      } else {
        next.add(periodKey);
      }
      return next;
    });
  };

  // Get period label based on selected period type (user-friendly local format)
  const getPeriodLabel = (date: Date): string => {
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
      // month
      return date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
  };

  const getBreakdownTitle = (): string => {
    switch (selectedPeriod) {
      case "hour":
        return "Hourly Breakdown";
      case "day":
        return "Daily Breakdown";
      case "week":
        return "Weekly Breakdown";
      case "month":
        return "Monthly Breakdown";
      default:
        return "Breakdown";
    }
  };

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
      <Card>
        <CardHeader>
          <CardTitle>Statistics ({selectedPeriod})</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(periodStats.skills).length > 0 && (
            <div className="flex flex-col gap-1">
              {(Object.entries(periodStats.skills) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([skill, exp]) => (
                  <div key={skill} className="flex justify-between">
                    <span className="text-sm">{skill}</span>
                    <span className="text-sm font-medium">{exp.toLocaleString()} exp</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getBreakdownTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          {periodBreakdown.length === 0 ? (
            <p className="text-sm">No tracked data available</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {selectedPeriod === "hour"
                        ? "Hour"
                        : selectedPeriod === "day"
                          ? "Day"
                          : selectedPeriod === "week"
                            ? "Week"
                            : "Month"}
                    </TableHead>
                    <TableHead className="text-right">Total Gained Exp</TableHead>
                    <TableHead className="text-right">HP Used</TableHead>
                    <TableHead className="text-right">Total Drops</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodBreakdown.map(periodData => {
                    const isExpanded = expandedHours.has(periodData.periodKey);
                    const periodLabel = getPeriodLabel(periodData.date);

                    return (
                      <React.Fragment key={periodData.periodKey}>
                        <TableRow className="cursor-pointer" onClick={() => togglePeriod(periodData.periodKey)}>
                          <TableCell>{periodLabel}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {periodData.totalGainedExp.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {periodData.hpUsed ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  periodData.hpUsed.used > 0
                                    ? "text-red-500"
                                    : periodData.hpUsed.used < 0
                                      ? "text-green-500"
                                      : "text-foreground",
                                )}>
                                {periodData.hpUsed.used > 0 ? "-" : ""}
                                {Math.abs(periodData.hpUsed.used).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {periodData.totalDrops > 0 ? (
                              <span className="font-medium">{periodData.totalDrops.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {periodData.netProfit !== 0 ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  periodData.netProfit > 0
                                    ? "text-green-500"
                                    : periodData.netProfit < 0
                                      ? "text-red-500"
                                      : "text-foreground",
                                )}>
                                {periodData.netProfit >= 0 ? "+" : ""}
                                {periodData.netProfit.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{" "}
                                GP
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="px-4 py-3">
                              <div className="space-y-4">
                                {/* Skills Breakdown */}
                                <div>
                                  <p className="mb-2 text-sm font-semibold">Skills Breakdown</p>
                                  {Object.keys(periodData.skills).length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {Object.entries(periodData.skills)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([skill, exp]) => (
                                          <div key={skill} className="flex justify-between">
                                            <span className="text-sm">{skill}</span>
                                            <span className="text-sm font-medium">{exp.toLocaleString()} exp</span>
                                          </div>
                                        ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No skill data available</p>
                                  )}
                                </div>

                                {/* HP Used Details */}
                                {periodData.hpUsed && (
                                  <div className="border-t pt-2">
                                    <p className="mb-2 text-sm font-semibold">HP Used</p>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">HP Used:</span>
                                        <span
                                          className={cn(
                                            "text-sm font-medium",
                                            periodData.hpUsed.used > 0
                                              ? "text-red-500"
                                              : periodData.hpUsed.used < 0
                                                ? "text-green-500"
                                                : "text-foreground",
                                          )}>
                                          {periodData.hpUsed.used > 0 ? "-" : ""}
                                          {Math.abs(periodData.hpUsed.used).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Start HP:</span>
                                        <span className="text-sm font-medium">
                                          {periodData.hpUsed.startHP.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">End HP:</span>
                                        <span className="text-sm font-medium">
                                          {periodData.hpUsed.endHP.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Drops Breakdown */}
                                {Object.keys(periodData.dropStats).length > 0 && (
                                  <div className="border-t pt-2">
                                    <p className="mb-2 text-sm font-semibold">
                                      Drops ({periodData.totalDrops} total,{" "}
                                      {periodData.totalDropAmount.toLocaleString()} items)
                                    </p>
                                    <div className="mb-2 flex justify-between border-b pb-1">
                                      <span className="text-sm font-semibold">Total Drop Value:</span>
                                      <span className="text-sm font-semibold text-green-500">
                                        {periodData.totalDropValue.toLocaleString(undefined, {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0,
                                        })}{" "}
                                        GP
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {Object.entries(periodData.dropStats)
                                        .sort((a, b) => {
                                          // Sort by total value (amount * itemValue)
                                          const aValue = a[1].totalAmount * (parseFloat(itemValues[a[0]] || "0") || 0);
                                          const bValue = b[1].totalAmount * (parseFloat(itemValues[b[0]] || "0") || 0);
                                          return bValue - aValue;
                                        })
                                        .map(([name, stats]) => {
                                          const itemValue = parseFloat(itemValues[name] || "0") || 0;
                                          const totalValue = stats.totalAmount * itemValue;
                                          return (
                                            <div key={name} className="flex justify-between">
                                              <span className="text-sm">{name}</span>
                                              <div className="flex flex-col items-end gap-0.5">
                                                <span className="text-sm font-medium">
                                                  {stats.totalAmount.toLocaleString()} ({stats.count}x)
                                                </span>
                                                {totalValue > 0 && (
                                                  <span className="text-xs text-green-500">
                                                    {totalValue.toLocaleString(undefined, {
                                                      minimumFractionDigits: 0,
                                                      maximumFractionDigits: 0,
                                                    })}{" "}
                                                    GP
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}

                                {/* Items Produced (Skilling) */}
                                {Object.keys(periodData.itemsProduced).length > 0 && (
                                  <div className="border-t pt-2">
                                    <p className="mb-2 text-sm font-semibold">Items Produced</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {Object.entries(periodData.itemsProduced).map(([name, data]) => (
                                        <span key={name} className="text-xs">
                                          +{data.quantity.toLocaleString()} {name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Skilling Actions Count */}
                                {periodData.totalSkillingActions > 0 && (
                                  <div className="border-t pt-2">
                                    <span className="text-xs text-muted-foreground">
                                      Actions: {periodData.totalSkillingActions}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
