import { UPDATE_SCREEN_DATA, UPDATE_USER_STATS } from "@app/constants";
import { TRACKED_DATA_QUERY_KEY } from "@app/hooks";
import { getTrackedData } from "@app/utils/storage-service";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Global hook to sync data updates across all components
 * This should be called at the app root level to ensure message listeners
 * are always active regardless of which component is currently mounted
 *
 * Uses optimistic cache updates instead of invalidation for better performance
 */
export const useGlobalDataSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for UPDATE_SCREEN_DATA messages from background script
    // Instead of invalidating, we directly update the cache with fresh data
    const messageListener = async (message: { type: string; data?: unknown }) => {
      if (message.type === UPDATE_SCREEN_DATA) {
        // Fetch fresh data and update cache directly
        // This is more efficient than invalidate + refetch
        try {
          const freshData = await getTrackedData();
          queryClient.setQueryData(TRACKED_DATA_QUERY_KEY, freshData);
        } catch {
          // If fetch fails, fall back to invalidation
          queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
        }
      }

      if (message.type === UPDATE_USER_STATS) {
        // Update user stats cache directly
        try {
          if (message.data) {
            queryClient.setQueryData(["userStats"], message.data);
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ["userStats"] });
        }
        // Also invalidate related queries that depend on user stats
        queryClient.invalidateQueries({ queryKey: ["sessionBaseline"] });
        queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });
      }
    };

    // Storage listener as a backup mechanism
    // Only triggers if message listener somehow fails
    const storageListener = async (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "local" && changes.tracked_data_csv) {
        const newValue = changes.tracked_data_csv.newValue;
        if (newValue && newValue.trim().length > 0) {
          // Directly update cache with fresh data
          try {
            const freshData = await getTrackedData();
            queryClient.setQueryData(TRACKED_DATA_QUERY_KEY, freshData);
          } catch {
            // If fetch fails, fall back to invalidation
            queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);
};
