import { TRACKED_DATA_QUERY_KEY, useTrackedDataQuery } from "./useTrackedDataQuery";
import { UNTRACKED_EXP_QUERY_KEY, useUntrackedExp } from "./useUntrackedExp";
import { parseDropAmount, parseDrops } from "@app/utils/formatting";
import { appendTrackedData, resolveUntrackedExpRecords } from "@app/utils/storage-service";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { UntrackedExpRecord } from "@app/types";
import type { CSVRow } from "@app/utils/csv-tracker";

interface UntrackedGap {
  id: string; // First record's ID
  records: UntrackedExpRecord[];
  startUTC: string; // Earliest start
  endUTC: string; // Latest end
  hours: number[]; // [18, 19, 20] for 6-8 PM
  totalBySkill: Record<string, number>; // { Defence: 100000 }
}

interface ResolutionRow {
  id: string; // crypto.randomUUID()
  hour: number; // 0-23
  skill: string;
  exp: number;
  loot: Array<{ name: string; quantity: number }>;
}

/**
 * Group unresolved records by overlapping time ranges
 */
const groupByTimeGap = (records: UntrackedExpRecord[]): UntrackedGap[] => {
  if (records.length === 0) return [];

  // Sort by startUTC
  const sorted = [...records].sort((a, b) => new Date(a.startUTC).getTime() - new Date(b.startUTC).getTime());

  const gaps: UntrackedGap[] = [];
  let currentGroup: UntrackedExpRecord[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    const prevEnd = new Date(prev.endUTC).getTime();
    const currStart = new Date(curr.startUTC).getTime();

    // If current record starts before previous ends, they overlap
    if (currStart < prevEnd) {
      currentGroup.push(curr);
    } else {
      // No overlap - finalize current group and start new one
      gaps.push(createGapFromGroup(currentGroup));
      currentGroup = [curr];
    }
  }

  // Finalize last group
  if (currentGroup.length > 0) {
    gaps.push(createGapFromGroup(currentGroup));
  }

  return gaps;
};

/**
 * Create a gap object from a group of overlapping records
 */
const createGapFromGroup = (records: UntrackedExpRecord[]): UntrackedGap => {
  const startTimes = records.map(r => new Date(r.startUTC).getTime());
  const endTimes = records.map(r => new Date(r.endUTC).getTime());

  const earliestStart = Math.min(...startTimes);
  const latestEnd = Math.max(...endTimes);

  const startUTC = new Date(earliestStart).toISOString();
  const endUTC = new Date(latestEnd).toISOString();

  // Compute hours array
  const startDate = new Date(earliestStart);
  const endDate = new Date(latestEnd);
  const startHour = startDate.getHours();
  const endHour = endDate.getMinutes() > 0 ? endDate.getHours() : endDate.getHours() - 1;

  const hours: number[] = [];
  if (endHour >= startHour) {
    // Normal case: same day
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }
  } else {
    // Midnight crossing: e.g., startHour=23, endHour=1
    for (let h = startHour; h <= 23; h++) {
      hours.push(h);
    }
    for (let h = 0; h <= endHour; h++) {
      hours.push(h);
    }
  }

  // Aggregate exp by skill
  const totalBySkill: Record<string, number> = {};
  records.forEach(r => {
    totalBySkill[r.skill] = (totalBySkill[r.skill] || 0) + r.expGained;
  });

  return {
    id: records[0].id,
    records,
    startUTC,
    endUTC,
    hours,
    totalBySkill,
  };
};

/**
 * Hook providing untracked exp resolution capabilities.
 * Groups unresolved gaps, provides pre-populated resolution rows, and saves resolutions.
 */
export const useUntrackedResolution = () => {
  const queryClient = useQueryClient();
  const { unresolvedRecords } = useUntrackedExp();
  const { allData } = useTrackedDataQuery();

  // Group unresolved records into gaps
  const unresolvedGaps = useMemo(() => groupByTimeGap(unresolvedRecords), [unresolvedRecords]);

  const hasUnresolved = unresolvedGaps.length > 0;

  // Extract unique item names from tracked data (for loot selector)
  const knownItems = useMemo(() => {
    const itemSet = new Set<string>();

    allData.forEach(row => {
      // Extract from drops field
      if (row.drops) {
        const drops = parseDrops(row.drops);
        drops.forEach(drop => {
          const { name } = parseDropAmount(drop);
          if (name) itemSet.add(name);
        });
      }

      // Extract from actionOutput (produced items)
      if (row.actionOutput) {
        try {
          const output = JSON.parse(row.actionOutput) as Array<{ item: string; quantity: number }>;
          output.forEach(({ item }) => {
            if (item) itemSet.add(item);
          });
        } catch {
          // Ignore parse errors
        }
      }
    });

    return Array.from(itemSet).sort();
  }, [allData]);

  /**
   * Generate pre-populated resolution rows for a gap
   */
  const getInitialRows = useCallback((gap: UntrackedGap): ResolutionRow[] => {
    const rows: ResolutionRow[] = [];
    const numHours = gap.hours.length;

    Object.entries(gap.totalBySkill).forEach(([skill, total]) => {
      const expPerHour = Math.floor(total / numHours);
      const remainder = total - expPerHour * numHours;

      gap.hours.forEach((hour, index) => {
        const isLastHour = index === gap.hours.length - 1;
        const exp = isLastHour ? expPerHour + remainder : expPerHour;

        rows.push({
          id: crypto.randomUUID(),
          hour,
          skill,
          exp,
          loot: [],
        });
      });
    });

    return rows;
  }, []);

  /**
   * Save resolution: create synthetic CSVRows and mark gap as resolved
   */
  const saveResolution = useCallback(
    async (gapRecordIds: string[], rows: ResolutionRow[], gapDate: Date): Promise<void> => {
      // Filter rows with data
      const validRows = rows.filter(r => r.exp > 0 || r.loot.length > 0);

      // Create synthetic CSVRows
      const syntheticRows: CSVRow[] = validRows.map(row => {
        // Set timestamp to gap date at the specified hour, minute 30
        const timestamp = new Date(gapDate);
        timestamp.setHours(row.hour, 30, 0, 0);

        // Format drops field
        const drops = row.loot.map(l => `${l.quantity} ${l.name}`).join(";");

        return {
          timestamp: timestamp.toISOString(),
          uuid: crypto.randomUUID(),
          skill: row.skill,
          skillLevel: "",
          expForNextLevel: "",
          gainedExp: String(row.exp),
          drops,
          hp: "",
          monster: "",
          location: "",
          damageDealt: "",
          damageReceived: "",
          peopleFighting: "",
          totalFights: "",
          totalInventoryHP: "",
          hpUsed: "",
          equipment: "",
          combatExp: "",
          actionType: "",
          actionOutput: "",
        };
      });

      // Append to tracked data
      if (syntheticRows.length > 0) {
        await appendTrackedData(syntheticRows);
      }

      // Mark records as resolved
      await resolveUntrackedExpRecords(gapRecordIds);

      // Invalidate TanStack Query caches
      queryClient.invalidateQueries({ queryKey: TRACKED_DATA_QUERY_KEY });
      queryClient.refetchQueries({ queryKey: TRACKED_DATA_QUERY_KEY, type: "active" });
      queryClient.invalidateQueries({ queryKey: UNTRACKED_EXP_QUERY_KEY });
      queryClient.refetchQueries({ queryKey: UNTRACKED_EXP_QUERY_KEY, type: "active" });
    },
    [queryClient],
  );

  return {
    unresolvedGaps,
    knownItems,
    hasUnresolved,
    getInitialRows,
    saveResolution,
  };
};

export type { UntrackedGap, ResolutionRow };
