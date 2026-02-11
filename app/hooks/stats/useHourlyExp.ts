import { filterByHour } from "../../utils/csv-tracker";
import { useTrackedDataQuery } from "../data/useTrackedDataQuery";
import { useState, useEffect, useCallback } from "react";
import type { CombatExpGain } from "@app/types";

export interface HourlyExpStats {
  totalExpThisHour: number;
  expBySkill: Record<string, number>;
  currentHour: number;
}

/**
 * Hook to get exp gains for the current hour
 *
 * DATA SOURCE: tracked_data_csv (via useTrackedDataQuery)
 * This calculates current hour exp from tracked screen data, NOT from stats page.
 * Automatically resets when a new hour starts.
 */
export const useHourlyExp = (): HourlyExpStats => {
  const [stats, setStats] = useState<HourlyExpStats>({
    totalExpThisHour: 0,
    expBySkill: {},
    currentHour: new Date().getHours(),
  });

  // allData comes from tracked_data_csv via useTrackedDataQuery
  const { allData } = useTrackedDataQuery();

  const calculateHourlyExp = useCallback(() => {
    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Filter to current hour and sort by timestamp (oldest first)
      const currentHourRows = filterByHour(allData, currentHour, now).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Sum all gainedExp values for each skill in the current hour
      // This directly sums all tracked gainedExp from storage for the current hour
      let totalGainedExp = 0;
      const expBySkill: Record<string, number> = {};

      currentHourRows.forEach(row => {
        const skill = row.skill || "";
        const gainedExp = parseInt(row.gainedExp || "0", 10) || 0;

        // Sum all gainedExp values for each skill
        if (gainedExp > 0) {
          totalGainedExp += gainedExp;

          if (skill) {
            expBySkill[skill] = (expBySkill[skill] || 0) + gainedExp;
          }
        }

        // Parse and add secondary exp (combatExp) from the row
        // IMPORTANT: Skip the main skill if it appears in combatExp, since its exp
        // is already calculated from total exp delta and stored in gainedExp
        if (row.combatExp && row.combatExp.trim() !== "") {
          try {
            const combatExpGains: CombatExpGain[] = JSON.parse(row.combatExp);
            if (Array.isArray(combatExpGains)) {
              combatExpGains.forEach((gain: CombatExpGain) => {
                const combatSkill = gain.skill || "";
                const combatExp = parseInt(gain.exp || "0", 10) || 0;
                // Skip if this is the main skill - its exp is already in gainedExp (calculated from total exp delta)
                if (combatSkill && combatExp > 0 && combatSkill !== skill) {
                  totalGainedExp += combatExp;
                  expBySkill[combatSkill] = (expBySkill[combatSkill] || 0) + combatExp;
                }
              });
            }
          } catch {
            // Silently handle JSON parse errors
          }
        }
      });

      setStats({
        totalExpThisHour: totalGainedExp,
        expBySkill,
        currentHour,
      });
    } catch {
      // Silently handle errors
    }
  }, [allData]);

  useEffect(() => {
    // Calculate when data changes
    calculateHourlyExp();

    // Set up interval to check every minute (to catch hour changes)
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();

      // If hour changed, recalculate
      if (currentHour !== stats.currentHour) {
        calculateHourlyExp();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, [calculateHourlyExp, stats.currentHour]);

  return stats;
};
