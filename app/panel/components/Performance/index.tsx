import { EquipmentDisplay } from "./EquipmentDisplay";
import { useStatTable } from "./StatTable/useStatTable";
import { usePerformance } from "./usePerformance";
import {
  cn,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@app/components";
import { formatLocation } from "@app/utils/helpers";
import { memo, Fragment } from "react";
import type { StatRow } from "./StatTable";

/**
 * Monster Stat Table Component
 * Displays stats with simplified headers: Max, Average, Mean, Mode
 * Shows only hit stats (damage dealt for user, damage received for monster)
 */
const MonsterStatTable = memo(({ title, rows }: { title: string; rows: StatRow[] }) => {
  const { visibleRows, formatRowValue } = useStatTable(rows);

  if (visibleRows.length === 0) {
    return null;
  }

  // Only use the first 4 rows (hit stats)
  const hitStats = visibleRows.slice(0, 4);

  return (
    <div className="flex flex-col">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">Average</TableHead>
              <TableHead className="text-right">Mean</TableHead>
              <TableHead className="text-right">Mode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {hitStats.map((row, index) => {
                const displayValue = formatRowValue(row);
                const cellClassName = cn("text-right font-medium", row.className);
                return (
                  <TableCell key={`hit-${index}`} className={cellClassName}>
                    {displayValue}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

MonsterStatTable.displayName = "MonsterStatTable";

/**
 * Performance Component
 * Pure JSX component - all logic is in usePerformance hook
 */
const Performance = memo(() => {
  const { selectedLocation, setSelectedLocation, loading, userStats, locations, performanceStats, locationStats } =
    usePerformance();

  if (loading) {
    return <div className={cn("p-4 text-lg font-semibold")}>Loading tracked data...</div>;
  }

  // Helper to create simplified stat rows (Max, Average, Mean, Mode for hits only)
  const createHitStats = (
    maxHit: number,
    avgHit: number,
    meanHit: number,
    modeHit: number,
    isDamageReceived: boolean = false,
  ): StatRow[] => {
    const className = isDamageReceived && maxHit > 0 ? "text-destructive" : undefined;
    return [
      { label: "Max", value: maxHit, className },
      {
        label: "Average",
        value: avgHit,
        format: (v: number | string) => (typeof v === "number" ? Math.round(v).toLocaleString() : v.toString()),
        className,
      },
      {
        label: "Mean",
        value: meanHit,
        format: (v: number | string) => (typeof v === "number" ? Math.round(v).toLocaleString() : v.toString()),
        className,
      },
      { label: "Mode", value: modeHit, className },
    ];
  };

  return (
    <div className={cn("flex flex-col gap-4")}>
      {/* Location Tabs */}
      <Tabs value={selectedLocation} onValueChange={setSelectedLocation}>
        <TabsList className="w-full flex-wrap gap-2">
          {locations.map(location => (
            <TabsTrigger key={location} value={location}>
              {location === "all" ? "All Locations" : formatLocation(location)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Location Stats Card (only for specific locations) */}
      {selectedLocation !== "all" && locationStats.totalFights > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col justify-center gap-6 sm:flex-row sm:justify-start">
              {/* Left Column - Stats */}
              <div className="flex flex-col gap-3">
                <h3 className="text-center text-lg font-semibold sm:text-left">{formatLocation(selectedLocation)}</h3>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Total Fights Tracked</span>
                  <span className="text-2xl font-bold">{locationStats.totalFights.toLocaleString()}</span>
                </div>
                {locationStats.avgHitsToKill > 0 && (
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Avg Hits to Kill</span>
                    <span className="text-2xl font-bold">{locationStats.avgHitsToKill.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Avg Damage per 15 Min</span>
                  <span className="text-2xl font-bold text-destructive">
                    {Math.round(locationStats.avgDamagePer15Min).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Max Damage per 15 Min</span>
                  <span className="text-2xl font-bold text-destructive">
                    {Math.round(locationStats.maxDamagePer15Min).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Right Column - Average Equipment */}
              {locationStats.avgEquipment && <EquipmentDisplay equipment={locationStats.avgEquipment} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Table */}
      {Object.keys(performanceStats.maxHitByMonster ?? {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Name</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Mode</TableHead>
                    <TableHead className="text-right">Hits/Kill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* User Stats Row */}
                  <TableRow>
                    <TableCell className="text-left font-medium">{userStats?.username || "User"}</TableCell>
                    {createHitStats(
                      performanceStats.maxHit,
                      performanceStats.avgHit,
                      performanceStats.meanHit,
                      performanceStats.modeHit,
                      false,
                    ).map((stat, index) => {
                      const displayValue = stat.format
                        ? stat.format(stat.value)
                        : typeof stat.value === "number"
                          ? stat.value.toLocaleString()
                          : stat.value.toString();
                      const cellClassName = cn("text-right font-medium", stat.className);
                      return (
                        <TableCell key={`user-${index}`} className={cellClassName}>
                          {displayValue}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium">
                      {performanceStats.avgHitsToKill > 0 ? performanceStats.avgHitsToKill.toFixed(1) : "-"}
                    </TableCell>
                  </TableRow>

                  {/* Monster Rows */}
                  {Object.entries(performanceStats.maxHitByMonster)
                    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                    .map(([monster]) => {
                      const maxReceived =
                        (performanceStats.maxDamageReceivedByMonster as Record<string, number>)?.[monster] ?? 0;
                      const avgReceived =
                        (performanceStats.avgDamageReceivedByMonster as Record<string, number>)?.[monster] ?? 0;
                      const meanReceived =
                        (performanceStats.meanDamageReceivedByMonster as Record<string, number>)?.[monster] ?? 0;
                      const modeReceived =
                        (performanceStats.modeDamageReceivedByMonster as Record<string, number>)?.[monster] ?? 0;
                      const avgHitsToKill =
                        (performanceStats.avgHitsToKillByMonster as Record<string, number>)?.[monster] ?? 0;

                      // Monster stats (damage received from monster - monster's hits)
                      const monsterStats = createHitStats(maxReceived, avgReceived, meanReceived, modeReceived, true);

                      return (
                        <Fragment key={monster}>
                          {/* Monster Name Separator Row */}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={6} className="py-3 text-center text-lg font-bold">
                              {monster}
                            </TableCell>
                          </TableRow>
                          {/* Monster Stats Row */}
                          <TableRow>
                            <TableCell className="text-left font-medium">{monster}</TableCell>
                            {monsterStats.map((stat, index) => {
                              const displayValue = stat.format
                                ? stat.format(stat.value)
                                : typeof stat.value === "number"
                                  ? stat.value.toLocaleString()
                                  : stat.value.toString();
                              const cellClassName = cn("text-right font-medium", stat.className);
                              return (
                                <TableCell key={`monster-${monster}-${index}`} className={cellClassName}>
                                  {displayValue}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-medium">
                              {avgHitsToKill > 0 ? avgHitsToKill.toFixed(1) : "-"}
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

Performance.displayName = "Performance";

export default Performance;
