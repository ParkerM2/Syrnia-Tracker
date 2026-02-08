import { getUserStatsFromStorage } from '../utils/user-stats-storage';
import { UPDATE_USER_STATS } from '@app/constants';
import { useState, useEffect, useCallback } from 'react';
import type { UserStats } from '@app/types';

/**
 * Hook to access user stats from storage
 */
export const useUserStats = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getUserStatsFromStorage();
      setUserStats(stats);
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Listen for storage changes to automatically refresh when new data is saved
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.user_stats_csv) {
        // User stats CSV was updated, refresh
        void refresh();
      }
    };

    // Also listen for runtime messages
    const messageListener = (message: { type: string; data?: UserStats }) => {
      if (message.type === UPDATE_USER_STATS && message.data) {
        setUserStats(message.data);
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listeners on unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [refresh]);

  return {
    userStats,
    loading,
    refresh,
  };
};
