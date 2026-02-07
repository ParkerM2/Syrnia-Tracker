import { useUserStatsQuery, usePeriodStats } from '@extension/shared';
import { useCallback, useMemo } from 'react';
import type { TimePeriod } from '@extension/shared';

export const useExpChart = () => {
  const { userStats } = useUserStatsQuery();
  const { periodBreakdown, selectedPeriod, setSelectedPeriod, loading } = usePeriodStats('hour');

  const userName = useMemo(() => userStats?.username || 'Player', [userStats?.username]);

  const handleImportClick = useCallback(() => {
    chrome.tabs.create({
      url: 'https://www.syrnia.com/theGame/includes2/stats.php',
    });
  }, []);

  const showLoading = loading && periodBreakdown.length === 0;

  const handlePeriodChange = useCallback((v: string) => setSelectedPeriod(v as TimePeriod), [setSelectedPeriod]);

  return {
    userName,
    periodBreakdown,
    selectedPeriod,
    handlePeriodChange,
    handleImportClick,
    showLoading,
  };
};
