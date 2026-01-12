import { useTrackedDataQuery } from './useTrackedDataQuery.js';
import { filterByHour } from '../utils/csv-tracker.js';
import { useState, useEffect, useCallback } from 'react';
import type { CSVRow } from '../utils/csv-tracker.js';

export interface HourlyExpStats {
  totalExpThisHour: number;
  expBySkill: Record<string, number>;
  currentHour: number;
}

/**
 * Hook to get exp gains for the current hour
 *
 * DATA SOURCE: tracked_data_csv (via useTrackedDataQuery)
 * This calculates current hour exp from tracked screen data, NOT from stats page.
 * Automatically resets when a new hour starts.
 */
export const useHourlyExp = (): HourlyExpStats => {
  const [stats, setStats] = useState<HourlyExpStats>({
    totalExpThisHour: 0,
    expBySkill: {},
    currentHour: new Date().getHours(),
  });

  // allData comes from tracked_data_csv via useTrackedDataQuery
  const { allData } = useTrackedDataQuery();

  const calculateHourlyExp = useCallback(() => {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Filter to current hour and sort by timestamp (oldest first)
      const currentHourRows = filterByHour(allData, currentHour, now).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
      // This matches the logic in useHourStats to ensure consistent values
      const uniqueEntriesMap = new Map<string, CSVRow>();

      currentHourRows.forEach(row => {
        const skill = row.skill || '';
        const key = `${row.timestamp}-${skill}`;
        const existing = uniqueEntriesMap.get(key);

        if (!existing) {
          uniqueEntriesMap.set(key, row);
        } else {
          // Keep the one with higher gainedExp or more complete data
          const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
          const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;
          if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
            uniqueEntriesMap.set(key, row);
          }
        }
      });

      // Process unique entries only
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      // Use saved gainedExp directly (it's already calculated and saved)
      let totalGainedExp = 0;
      const expBySkill: Record<string, number> = {};

      uniqueEntries.forEach(row => {
        const skill = row.skill || '';
        const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        // Only count entries with gainedExp > 0
        if (gainedExp > 0) {
          totalGainedExp += gainedExp;

          if (skill) {
            expBySkill[skill] = (expBySkill[skill] || 0) + gainedExp;
          }
        }
      });

      setStats({
        totalExpThisHour: totalGainedExp,
        expBySkill,
        currentHour,
      });
    } catch (error) {
      console.error('Error calculating hourly exp:', error);
    }
  }, [allData]);

  useEffect(() => {
    // Calculate when data changes
    calculateHourlyExp();

    // Set up interval to check every minute (to catch hour changes)
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();

      // If hour changed, recalculate
      if (currentHour !== stats.currentHour) {
        calculateHourlyExp();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, [calculateHourlyExp, stats.currentHour]);

  return stats;
};
