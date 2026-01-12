import { UPDATE_USER_STATS } from '../../const.js';
import { getUserStats } from '../utils/storage-service.js';
import { getUserStatsCSVHeader } from '../utils/user-stats-storage.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { UserStats } from '../utils/types.js';

// Query key for user stats
export const USER_STATS_QUERY_KEY = ['userStats'] as const;

/**
 * Hook to access user stats from storage using TanStack Query
 * This provides background refetching without showing loading states
 */
export const useUserStatsQuery = () => {
  const queryClient = useQueryClient();

  // Main query for user stats
  const {
    data: userStats = null,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: USER_STATS_QUERY_KEY,
    queryFn: async () => {
      const stats = await getUserStats();
      // Don't return null if we have invalid data - keep existing cache if available
      if (!stats) {
        const cachedData = queryClient.getQueryData<UserStats>(USER_STATS_QUERY_KEY);
        if (cachedData && cachedData.username && Object.keys(cachedData.skills || {}).length > 0) {
          return cachedData;
        }
      }
      return stats;
    },
    // Data is fresh for 1 second, preventing unnecessary refetches
    staleTime: 1000,
    // Keep data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Don't refetch on window focus
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect
    refetchOnReconnect: false,
    // Only refetch on mount if data is stale
    refetchOnMount: false,
  });

  // Track if we just updated via message to avoid double-updating
  const justUpdatedViaMessageRef = useRef(false);

  // Listen for storage changes and invalidate query (triggers background refetch)
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.user_stats_csv) {
        // If we just updated via message, skip the storage invalidation to avoid double-update
        if (justUpdatedViaMessageRef.current) {
          justUpdatedViaMessageRef.current = false;
          return;
        }

        // Only invalidate if the new value is not empty/null and has actual data (not just header)
        const newValue = changes.user_stats_csv.newValue;
        const header = getUserStatsCSVHeader();
        if (newValue && newValue !== header && newValue.trim().length > header.length) {
          // Invalidate the query to trigger a background refetch
          // This will update the data without showing a loading state
          queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY });
        }
      }
    };

    // Also listen for runtime messages
    const messageListener = (message: { type: string; data?: UserStats }) => {
      if (message.type === UPDATE_USER_STATS && message.data) {
        // Only update if we have valid data (username and at least one skill)
        if (message.data.username && message.data.skills && Object.keys(message.data.skills).length > 0) {
          justUpdatedViaMessageRef.current = true;
          // Update the query cache directly with the new data
          queryClient.setQueryData(USER_STATS_QUERY_KEY, message.data);
          // Reset flag after a short delay
          setTimeout(() => {
            justUpdatedViaMessageRef.current = false;
          }, 1000);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [queryClient]);

  // Manual refresh function
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY });
    await queryClient.refetchQueries({ queryKey: USER_STATS_QUERY_KEY });
  };

  return {
    userStats,
    // Use isLoading only for initial load, isFetching for background updates
    // Components should check loading for initial loading state
    // and ignore isFetching to avoid flash during background updates
    loading: isLoading,
    isFetching,
    error,
    refresh,
  };
};
