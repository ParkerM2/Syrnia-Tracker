import { getCSVRows, downloadCSV, clearCSVData, clearCSVDataByHour } from '../utils/csv-storage.js';
import { filterByTimePeriod, filterByHour, filterByDay, aggregateStats } from '../utils/csv-tracker.js';
import { useState, useEffect, useCallback } from 'react';
import type { CSVRow, TimePeriod, TrackedStats } from '../utils/csv-tracker.js';

export interface UseTrackedDataReturn {
  allData: CSVRow[];
  dataByPeriod: (period: TimePeriod) => CSVRow[];
  dataByHour: (hour: number, date?: Date) => CSVRow[];
  dataByDay: (date: Date) => CSVRow[];
  stats: TrackedStats;
  statsByPeriod: (period: TimePeriod) => TrackedStats;
  refresh: () => Promise<void>;
  download: (saveAs?: boolean) => Promise<void>;
  clear: () => Promise<void>;
  clearByHour: (hour: number, date?: Date) => Promise<void>;
  loading: boolean;
}

/**
 * Hook to access and filter tracked CSV data
 */
export const useTrackedData = (): UseTrackedDataReturn => {
  const [allData, setAllData] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getCSVRows();
      setAllData(rows);
    } catch (error) {
      console.error('Error loading tracked data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Listen for storage changes to automatically refresh when new data is saved
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.tracked_data_csv) {
        // CSV data was updated, refresh
        void refresh();
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [refresh]);

  const dataByPeriod = useCallback((period: TimePeriod): CSVRow[] => filterByTimePeriod(allData, period), [allData]);

  const dataByHour = useCallback((hour: number, date?: Date): CSVRow[] => filterByHour(allData, hour, date), [allData]);

  const dataByDay = useCallback((date: Date): CSVRow[] => filterByDay(allData, date), [allData]);

  const stats = aggregateStats(allData);

  const statsByPeriod = useCallback(
    (period: TimePeriod): TrackedStats => {
      const filtered = dataByPeriod(period);
      return aggregateStats(filtered);
    },
    [dataByPeriod],
  );

  const download = useCallback(async (saveAs: boolean = true) => {
    try {
      await downloadCSV(saveAs);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await clearCSVData();
      await refresh();
    } catch (error) {
      console.error('Error clearing CSV data:', error);
      throw error;
    }
  }, [refresh]);

  const clearByHour = useCallback(
    async (hour: number, date?: Date) => {
      try {
        await clearCSVDataByHour(hour, date);
        await refresh();
      } catch (error) {
        console.error('Error clearing CSV data by hour:', error);
        throw error;
      }
    },
    [refresh],
  );

  return {
    allData,
    dataByPeriod,
    dataByHour,
    dataByDay,
    stats,
    statsByPeriod,
    refresh,
    download,
    clear,
    clearByHour,
    loading,
  };
};
