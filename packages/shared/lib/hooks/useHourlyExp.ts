import { getCSVRows } from '../utils/csv-storage.js';
import { filterByHour } from '../utils/csv-tracker.js';
import { useState, useEffect, useCallback } from 'react';

export interface HourlyExpStats {
  totalExpThisHour: number;
  expBySkill: Record<string, number>;
  currentHour: number;
}

/**
 * Hook to get exp gains for the current hour
 * Automatically resets when a new hour starts
 */
export const useHourlyExp = (): HourlyExpStats => {
  const [stats, setStats] = useState<HourlyExpStats>({
    totalExpThisHour: 0,
    expBySkill: {},
    currentHour: new Date().getHours(),
  });

  const calculateHourlyExp = useCallback(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Get all CSV rows
      const allRows = await getCSVRows();

      // Filter to current hour and sort by timestamp (oldest first)
      const currentHourRows = filterByHour(allRows, currentHour, now).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Use saved gainedExp directly (it's already calculated and saved)
      let totalGainedExp = 0;
      const expBySkill: Record<string, number> = {};

      currentHourRows.forEach(row => {
        const skill = row.skill || '';
        const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        totalGainedExp += gainedExp;

        if (skill && gainedExp > 0) {
          expBySkill[skill] = (expBySkill[skill] || 0) + gainedExp;
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
  }, []);

  useEffect(() => {
    // Calculate on mount
    void calculateHourlyExp();

    // Set up interval to check every minute (to catch hour changes)
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();

      // If hour changed, recalculate
      if (currentHour !== stats.currentHour) {
        void calculateHourlyExp();
      }
    }, 60000); // Check every minute

    // Also listen for storage changes (when new data is added)
    const handleStorageChange = () => {
      void calculateHourlyExp();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [calculateHourlyExp, stats.currentHour]);

  return stats;
};
