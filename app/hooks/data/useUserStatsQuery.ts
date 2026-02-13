import { getUserStats, getUserStatsCSVHeader } from "../../utils/storage-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Query key for user stats
export const USER_STATS_QUERY_KEY = ["userStats"] as const;

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
    // Always refetch on mount to ensure fresh data
    refetchOnMount: "always",
  });

  // Listen for storage changes and invalidate query (triggers background refetch)
  // Message handling is consolidated in useGlobalDataSync (called at app root)
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "local" && changes.user_stats_csv) {
        const newValue = changes.user_stats_csv.newValue;
        const header = getUserStatsCSVHeader();
        if (newValue && newValue !== header && newValue.trim().length > header.length) {
          queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY });
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
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
