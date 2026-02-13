import { getUntrackedExpRecords } from "@app/utils/storage-service";
import { MS_PER_DAY, MS_PER_HOUR } from "@app/utils/time-constants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { UntrackedExpRecord } from "@app/types";

// Cell durations in ms for each granularity level
const CELL_DURATION_MS: Record<string, number> = {
  hour: MS_PER_HOUR,
  day: MS_PER_DAY,
  month: 30 * MS_PER_DAY,
};

export const UNTRACKED_EXP_QUERY_KEY = ["untrackedExp"] as const;

export interface UntrackedExpForPeriod {
  records: UntrackedExpRecord[];
  indicatorRecords: UntrackedExpRecord[];
  totalBySkill: Record<string, number>;
  totalExp: number;
}

/**
 * Hook that provides untracked exp records with view-relative indicator logic.
 * Uses TanStack Query to load from storage.
 * Listens for storage changes on `untracked_exp_records` key to invalidate query cache.
 */
export const useUntrackedExp = () => {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: UNTRACKED_EXP_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getUntrackedExpRecords();
      } catch {
        return [];
      }
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: "always",
  });

  // Listen for storage changes on the untracked_exp_records key
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "local" && changes.untracked_exp_records) {
        queryClient.invalidateQueries({ queryKey: UNTRACKED_EXP_QUERY_KEY });
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);

  // Get records that overlap a time range
  const getRecordsInRange = useCallback(
    (start: Date, end: Date): UntrackedExpRecord[] =>
      records.filter(record => {
        const rStart = new Date(record.startUTC).getTime();
        const rEnd = new Date(record.endUTC).getTime();
        return rStart < end.getTime() && rEnd > start.getTime();
      }),
    [records],
  );

  // Get aggregated untracked exp for a time range, with view-relative indicator logic
  const getUntrackedForRange = useCallback(
    (start: Date, end: Date, cellGranularity: "hour" | "day" | "month"): UntrackedExpForPeriod => {
      const overlapping = getRecordsInRange(start, end);
      const cellDurationMs = CELL_DURATION_MS[cellGranularity];
      const totalBySkill: Record<string, number> = {};
      let totalExp = 0;

      overlapping.forEach(record => {
        totalBySkill[record.skill] = (totalBySkill[record.skill] || 0) + record.expGained;
        totalExp += record.expGained;
      });

      // Only records whose gap duration > cell duration show the ! indicator
      const indicatorRecords = overlapping.filter(r => r.durationMs > cellDurationMs);

      return { records: overlapping, indicatorRecords, totalBySkill, totalExp };
    },
    [getRecordsInRange],
  );

  return { records, getRecordsInRange, getUntrackedForRange };
};
