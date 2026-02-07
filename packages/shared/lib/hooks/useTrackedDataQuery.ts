import { UPDATE_SCREEN_DATA } from '../../const.js';
import { filterByTimePeriod, filterByHour, filterByDay, aggregateStats } from '../utils/csv-tracker.js';
import {
  getTrackedData,
  clearTrackedData,
  clearTrackedDataByHour,
  downloadTrackedDataCSV,
} from '../utils/storage-service.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import type { CSVRow, TimePeriod, TrackedStats } from '../utils/csv-tracker.js';
import type { ScreenData } from '../utils/types.js';

// Query key for tracked data
export const TRACKED_DATA_QUERY_KEY = ['trackedData'] as const;

/**
 * Hook to access and filter tracked CSV data using TanStack Query
 *
 * DATA SOURCE: tracked_data_csv (Chrome storage)
 * This is the PRIMARY source for current hour exp tracking from screen data.
 * Stats page data (user_stats_csv) does NOT affect this.
 *
 * This provides background refetching without showing loading states.
 * Automatically updates when tracked_data_csv storage changes.
 */
export const useTrackedDataQuery = () => {
  const queryClient = useQueryClient();

  // Main query for tracked data
  // Reads from tracked_data_csv storage key
  const {
    data: allData = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: TRACKED_DATA_QUERY_KEY,
    queryFn: async () => {
      try {
        // getTrackedData() reads from tracked_data_csv storage key
        const rows = await getTrackedData();
        return rows;
      } catch {
        return [];
      }
    },
    // Data is considered stale after 100ms to allow quick updates while preventing excessive refetches
    staleTime: 100,
    // Keep data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Don't refetch on window focus
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect
    refetchOnReconnect: false,
    // Refetch on mount if data is stale or missing (ensures initial load)
    refetchOnMount: 'always',
  });

  // Track if we just updated via message to avoid double-updating
  const justUpdatedViaMessageRef = useRef(false);

  // Listen for storage changes and invalidate query (triggers background refetch)
  // This ensures UI updates automatically when tracked_data_csv changes
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.tracked_data_csv) {
        // If we just updated via message, skip the storage invalidation to avoid double-update
        if (justUpdatedViaMessageRef.current) {
          justUpdatedViaMessageRef.current = false;
          return;
        }

        // Only invalidate if the new value is not empty/null and has actual data (not just header)
        const newValue = changes.tracked_data_csv.newValue;
        if (newValue && newValue.trim().length > 0) {
          // Force refetch by invalidating and refetching
          // This ensures data updates even if it was recently fetched
          queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
          queryClient.refetchQueries({
            queryKey: TRACKED_DATA_QUERY_KEY,
            type: 'active',
          });
        }
      }
    };

    // Also listen for runtime messages to update cache immediately when scrape is saved
    // The background script only sends this message AFTER successfully saving unique scrape data
    const messageListener = (message: { type: string; data?: ScreenData }) => {
      if (message.type === UPDATE_SCREEN_DATA && message.data) {
        justUpdatedViaMessageRef.current = true;
        // Invalidate and refetch to get the updated data
        // Use a small delay to ensure storage changes have propagated
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
          queryClient.refetchQueries({
            queryKey: TRACKED_DATA_QUERY_KEY,
            type: 'active',
          });
          // Reset flag after a short delay
          setTimeout(() => {
            justUpdatedViaMessageRef.current = false;
          }, 1000);
        }, 50); // Small delay to ensure storage changes have propagated
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [queryClient]);

  // Mutation for clearing all data
  const clearMutation = useMutation({
    mutationFn: async () => {
      await clearTrackedData();
    },
    onSuccess: () => {
      // Optimistically update cache
      queryClient.setQueryData(TRACKED_DATA_QUERY_KEY, []);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
    },
  });

  // Mutation for clearing data by hour
  const clearByHourMutation = useMutation({
    mutationFn: async ({ hour, date }: { hour: number; date?: Date }) => {
      await clearTrackedDataByHour(hour, date);
    },
    onSuccess: () => {
      // Invalidate and refetch after clearing
      queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
    },
  });

  // Helper functions that work with the cached data
  // Memoize these functions so they only change when allData changes
  // This ensures dependent hooks (like useHourStats) recalculate when data updates
  const dataByPeriod = useMemo(
    () =>
      (period: TimePeriod): CSVRow[] =>
        filterByTimePeriod(allData, period),
    [allData],
  );

  const dataByHour = useMemo(
    () =>
      (hour: number, date?: Date): CSVRow[] =>
        filterByHour(allData, hour, date),
    [allData],
  );

  const dataByDay = useMemo(
    () =>
      (date: Date): CSVRow[] =>
        filterByDay(allData, date),
    [allData],
  );

  const stats = useMemo(() => aggregateStats(allData), [allData]);

  const statsByPeriod = useMemo(
    () =>
      (period: TimePeriod): TrackedStats => {
        const filtered = dataByPeriod(period);
        return aggregateStats(filtered);
      },
    [dataByPeriod],
  );

  // Manual refresh function
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
    await queryClient.refetchQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
  };

  // Download function - moved to useDataExport hook for better separation of concerns
  const download = async (saveAs: boolean = true) => {
    await downloadTrackedDataCSV(saveAs);
  };

  // Clear function
  const clear = async () => {
    await clearMutation.mutateAsync();
  };

  // Clear by hour function
  const clearByHour = async (hour: number, date?: Date) => {
    await clearByHourMutation.mutateAsync({ hour, date });
  };

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
    // Use isLoading only for initial load, isFetching for background updates
    // Components should check isLoading for initial loading state
    // and ignore isFetching to avoid flash during background updates
    loading: isLoading,
    isFetching,
    error,
  };
};
