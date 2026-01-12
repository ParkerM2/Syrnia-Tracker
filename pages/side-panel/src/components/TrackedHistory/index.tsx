import { useTrackedDataQuery, useDataExport, useItemValuesQuery, useFormatting } from '@extension/shared';
import {
  cn,
  Button,
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
} from '@extension/ui';
import React, { useState, useMemo } from 'react';
import type { CSVRow } from '@extension/shared';

type TimePeriod = 'hour' | 'day' | 'week' | 'month';

const TrackedHistory = () => {
  const { allData, stats, statsByPeriod, refresh, clear, loading } = useTrackedDataQuery();
  const { exportData, isExporting } = useDataExport();
  const { itemValues } = useItemValuesQuery();
  const { parseDrops, parseDropAmount } = useFormatting();

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());

  const periodStats = statsByPeriod(selectedPeriod);

  // Deduplicate all entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
  // This version includes ALL rows (not filtered by exp) - used for drops and HP calculations
  // IMPORTANT: Merge drops from all rows with the same timestamp+skill to preserve all drop data
  const allDeduplicatedData = useMemo(() => {
    const uniqueEntriesMap = new Map<string, CSVRow>();

    allData.forEach(row => {
      const key = `${row.timestamp}-${row.skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, { ...row });
      } else {
        // Merge drops from both rows
        const existingDrops = existing.drops || '';
        const currentDrops = row.drops || '';
        const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== '').join(';');

        // Keep the one with higher gainedExp or most complete data, but preserve merged drops
        const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
          // Current row is better, but use merged drops
          uniqueEntriesMap.set(key, { ...row, drops: mergedDrops });
        } else {
          // Existing row is better, but update with merged drops
          uniqueEntriesMap.set(key, { ...existing, drops: mergedDrops });
        }
      }
    });

    return Array.from(uniqueEntriesMap.values());
  }, [allData]);

  // Filtered version for exp calculations (only rows with gainedExp > 0)
  const allDeduplicatedDataWithExp = useMemo(
    () => allDeduplicatedData.filter(row => parseInt(row.gainedExp || '0', 10) > 0),
    [allDeduplicatedData],
  );

  // Group all data by the selected period type (hour/day/week/month)
  // We need to group ALL data (not just filtered) for accurate drop counting
  const periodBreakdown = useMemo(() => {
    // Group ALL deduplicated data by period (for drops and HP calculations)
    const allDataPeriodMap = new Map<string, { periodKey: string; date: Date; rows: CSVRow[] }>();
    allDeduplicatedData.forEach(row => {
      const date = new Date(row.timestamp);
      let periodKey: string;
      let periodDate: Date;

      if (selectedPeriod === 'hour') {
        // Group by hour
        periodKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0);
      } else if (selectedPeriod === 'day') {
        // Group by day
        periodKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        // Group by week (start of week = Sunday)
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        periodKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        periodDate = weekStart;
      } else {
        // month
        // Group by month
        periodKey = `${date.getFullYear()}-${date.getMonth()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
      }

      if (!allDataPeriodMap.has(periodKey)) {
        allDataPeriodMap.set(periodKey, {
          periodKey,
          date: periodDate,
          rows: [],
        });
      }
      allDataPeriodMap.get(periodKey)!.rows.push(row);
    });

    // Group filtered data (with exp > 0) by period (for exp calculations)
    const periodMap = new Map<string, { periodKey: string; date: Date; rows: CSVRow[] }>();

    allDeduplicatedDataWithExp.forEach(row => {
      const date = new Date(row.timestamp);
      let periodKey: string;
      let periodDate: Date;

      if (selectedPeriod === 'hour') {
        // Group by hour
        periodKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0);
      } else if (selectedPeriod === 'day') {
        // Group by day
        periodKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        // Group by week (start of week = Sunday)
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        periodKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        periodDate = weekStart;
      } else {
        // month
        // Group by month
        periodKey = `${date.getFullYear()}-${date.getMonth()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          periodKey,
          date: periodDate,
          rows: [],
        });
      }
      periodMap.get(periodKey)!.rows.push(row);
    });

    // Use parseDrops and parseDropAmount from useFormatting hook

    // Convert to array and calculate stats for each period
    // Use allDataPeriodMap for drops/HP, periodMap for exp
    return Array.from(allDataPeriodMap.values())
      .map(({ periodKey, date, rows: allRows }) => {
        // Get exp rows for this period (filtered)
        // Note: expRows are already deduplicated, so we calculate exp directly
        // instead of using aggregateStats which would deduplicate again
        const expRows = periodMap.get(periodKey)?.rows || [];

        // Calculate exp manually to avoid double deduplication
        // aggregateStats does its own deduplication, but our rows are already deduplicated
        let totalGainedExp = 0;
        const skills: Record<string, number> = {};

        expRows.forEach(row => {
          const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;
          if (gainedExp > 0) {
            totalGainedExp += gainedExp;
            const skill = row.skill || '';
            if (skill) {
              skills[skill] = (skills[skill] || 0) + gainedExp;
            }
          }
        });

        const periodStats = {
          totalExp: totalGainedExp,
          skills,
        };

        // Calculate HP used for this period (use ALL rows)
        // First try to use hpUsed from fight log (food eaten during fight)
        let totalHpUsed = 0;
        allRows.forEach(row => {
          if (row.hpUsed && row.hpUsed.trim() !== '') {
            const hpUsedValue = parseInt(row.hpUsed.replace(/,/g, ''), 10);
            if (!isNaN(hpUsedValue) && hpUsedValue > 0) {
              totalHpUsed += hpUsedValue;
            }
          }
        });

        // Get totalInventoryHP for start/end (for display purposes)
        const hpEntries = allRows
          .filter(row => row.totalInventoryHP && row.totalInventoryHP.trim() !== '')
          .map(row => {
            const hpValue = parseInt(row.totalInventoryHP.replace(/,/g, ''), 10);
            return {
              timestamp: row.timestamp,
              hp: isNaN(hpValue) ? null : hpValue,
            };
          })
          .filter(entry => entry.hp !== null)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let hpUsed: { used: number; startHP: number; endHP: number } | null = null;
        if (totalHpUsed > 0) {
          // Use hpUsed from fight log (food eaten during fight)
          const startHP = hpEntries.length > 0 ? hpEntries[0].hp! : 0;
          const endHP = hpEntries.length > 0 ? hpEntries[hpEntries.length - 1].hp! : 0;
          hpUsed = {
            used: totalHpUsed,
            startHP,
            endHP,
          };
        } else if (hpEntries.length >= 2) {
          // Fallback to old calculation if no hpUsed from fight log
          const firstHP = hpEntries[0].hp!;
          const lastHP = hpEntries[hpEntries.length - 1].hp!;
          hpUsed = {
            used: firstHP - lastHP,
            startHP: firstHP,
            endHP: lastHP,
          };
        }

        // Calculate drops for this period (use ALL rows, not just exp rows)
        const dropStats: Record<string, { count: number; totalAmount: number }> = {};
        allRows.forEach(row => {
          const drops = parseDrops(row.drops || '');
          drops.forEach(drop => {
            const { amount, name } = parseDropAmount(drop);
            if (!dropStats[name]) {
              dropStats[name] = { count: 0, totalAmount: 0 };
            }
            dropStats[name].count += 1;
            dropStats[name].totalAmount += amount;
          });
        });

        const totalDrops = Object.values(dropStats).reduce((sum, stat) => sum + stat.count, 0);
        const totalDropAmount = Object.values(dropStats).reduce((sum, stat) => sum + stat.totalAmount, 0);

        // Calculate total drop value using item values
        let totalDropValue = 0;
        Object.entries(dropStats).forEach(([name, stats]) => {
          const itemValue = parseFloat(itemValues[name] || '0');
          if (!isNaN(itemValue)) {
            totalDropValue += stats.totalAmount * itemValue;
          }
        });

        // Calculate HP value (HP used * 2.5)
        const hpValue = hpUsed ? hpUsed.used * 2.5 : 0;

        // Calculate net profit (drop value - HP value)
        const netProfit = totalDropValue - hpValue;

        return {
          periodKey,
          date,
          totalGainedExp: periodStats.totalExp,
          skills: periodStats.skills,
          hpUsed,
          dropStats,
          totalDrops,
          totalDropAmount,
          totalDropValue,
          hpValue,
          netProfit,
          rows: expRows, // Keep exp rows for display
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first
  }, [allDeduplicatedData, allDeduplicatedDataWithExp, selectedPeriod, itemValues, parseDrops, parseDropAmount]);

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
    if (selectedPeriod === 'hour') {
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (selectedPeriod === 'day') {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (selectedPeriod === 'week') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      // month
      return date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const getBreakdownTitle = (): string => {
    switch (selectedPeriod) {
      case 'hour':
        return 'Hourly Breakdown';
      case 'day':
        return 'Daily Breakdown';
      case 'week':
        return 'Weekly Breakdown';
      case 'month':
        return 'Monthly Breakdown';
      default:
        return 'Breakdown';
    }
  };

  const handleDownload = async () => {
    try {
      // Export tracked data CSV
      await exportData('tracked', true);
      alert('CSV file downloaded successfully!');
    } catch (error) {
      alert('Error downloading CSV file');
      console.error(error);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all tracked data? This action cannot be undone.')) {
      try {
        await clear();
        alert('All tracked data cleared successfully!');
      } catch (error) {
        alert('Error clearing tracked data');
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className={cn('text-lg font-semibold')}>Loading tracked data...</div>;
  }

  return (
    <div className={cn('flex w-full flex-col gap-4')}>
      <div className="flex flex-row items-center justify-end">
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={isExporting}
            variant="default"
            size="icon"
            aria-label="Download CSV">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </Button>
          <Button onClick={handleClear} variant="destructive" size="icon" aria-label="Clear All Data">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </Button>
          <Button onClick={refresh} variant="secondary" size="icon" aria-label="Refresh">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M8 16H3v5"></path>
            </svg>
          </Button>
        </div>
      </div>

      {/* Time Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={value => setSelectedPeriod(value as TimePeriod)}>
        <TabsList>
          {(['hour', 'day', 'week', 'month'] as TimePeriod[]).map(period => (
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
              {Object.entries(periodStats.skills)
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
                      {selectedPeriod === 'hour'
                        ? 'Hour'
                        : selectedPeriod === 'day'
                          ? 'Day'
                          : selectedPeriod === 'week'
                            ? 'Week'
                            : 'Month'}
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
                                  'font-medium',
                                  periodData.hpUsed.used > 0
                                    ? 'text-red-500'
                                    : periodData.hpUsed.used < 0
                                      ? 'text-green-500'
                                      : 'text-foreground',
                                )}>
                                {periodData.hpUsed.used > 0 ? '-' : ''}
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
                                  'font-medium',
                                  periodData.netProfit > 0
                                    ? 'text-green-500'
                                    : periodData.netProfit < 0
                                      ? 'text-red-500'
                                      : 'text-foreground',
                                )}>
                                {periodData.netProfit >= 0 ? '+' : ''}
                                {periodData.netProfit.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{' '}
                                GP
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
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
                                    <p className="text-muted-foreground text-sm">No skill data available</p>
                                  )}
                                </div>

                                {/* HP Used Details */}
                                {periodData.hpUsed && (
                                  <div className="border-t pt-2">
                                    <p className="mb-2 text-sm font-semibold">HP Used</p>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">HP Used:</span>
                                        <span
                                          className={cn(
                                            'text-sm font-medium',
                                            periodData.hpUsed.used > 0
                                              ? 'text-red-500'
                                              : periodData.hpUsed.used < 0
                                                ? 'text-green-500'
                                                : 'text-foreground',
                                          )}>
                                          {periodData.hpUsed.used > 0 ? '-' : ''}
                                          {Math.abs(periodData.hpUsed.used).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">Start HP:</span>
                                        <span className="text-sm font-medium">
                                          {periodData.hpUsed.startHP.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground text-sm">End HP:</span>
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
                                      Drops ({periodData.totalDrops} total,{' '}
                                      {periodData.totalDropAmount.toLocaleString()} items)
                                    </p>
                                    <div className="mb-2 flex justify-between border-b pb-1">
                                      <span className="text-sm font-semibold">Total Drop Value:</span>
                                      <span className="text-sm font-semibold text-green-500">
                                        {periodData.totalDropValue.toLocaleString(undefined, {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0,
                                        })}{' '}
                                        GP
                                      </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {Object.entries(periodData.dropStats)
                                        .sort((a, b) => {
                                          // Sort by total value (amount * itemValue)
                                          const aValue = a[1].totalAmount * (parseFloat(itemValues[a[0]] || '0') || 0);
                                          const bValue = b[1].totalAmount * (parseFloat(itemValues[b[0]] || '0') || 0);
                                          return bValue - aValue;
                                        })
                                        .map(([name, stats]) => {
                                          const itemValue = parseFloat(itemValues[name] || '0') || 0;
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
                                                    })}{' '}
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
              <p className="text-muted-foreground text-sm">Total Entries</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Total Experience</p>
              <p className="text-2xl font-bold">{stats.totalExp.toLocaleString()}</p>
            </div>
          </div>
          {stats.timeRange.start && (
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">
                Tracking from:{' '}
                {new Date(stats.timeRange.start).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}{' '}
                to{' '}
                {new Date(stats.timeRange.end).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
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
