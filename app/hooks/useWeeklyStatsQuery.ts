/**
 * Hook for accessing weekly stats using TanStack Query
 *
 * Weekly stats are the source of truth for weekly exp gains.
 * They are updated when:
 * 1. User visits the stats page (primary source)
 * 2. Tracked data is collected (fallback calculation)
 */

import { getWeeklyStats } from '../utils/storage-service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { WeeklyStatsRow } from '../utils/weekly-stats-storage';

// Query key for weekly stats
export const WEEKLY_STATS_QUERY_KEY = ['weeklyStats'] as const;

export interface UseWeeklyStatsQueryResult {
  weeklyStats: WeeklyStatsRow[];
  currentWeekStats: WeeklyStatsRow | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to access weekly stats using TanStack Query
 */
export const useWeeklyStatsQuery = (): UseWeeklyStatsQueryResult => {
  const queryClient = useQueryClient();

  const {
    data: weeklyStats = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: WEEKLY_STATS_QUERY_KEY,
    queryFn: async () => await getWeeklyStats(),
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Listen for storage changes
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.weekly_stats_csv) {
        queryClient.invalidateQueries({ queryKey: WEEKLY_STATS_QUERY_KEY });
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);

  // Get current week stats
  const currentWeekStats = weeklyStats.length > 0 ? weeklyStats[0] : null;

  // Manual refresh
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: WEEKLY_STATS_QUERY_KEY });
    await queryClient.refetchQueries({ queryKey: WEEKLY_STATS_QUERY_KEY });
  };

  return {
    weeklyStats,
    currentWeekStats,
    loading: isLoading,
    isFetching,
    error: error as Error | null,
    refresh,
  };
};
