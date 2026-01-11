import { useTrackedData } from './index.js';
import { parseDrops, parseDropAmount } from '../utils/formatting.js';
import { useMemo } from 'react';
import type { CSVRow } from '../utils/csv-tracker.js';

export interface HourStats {
  totalExp: number;
  expBySkill: Record<string, number>;
  dropStats: Record<string, { count: number; totalAmount: number }>;
  hpUsed: { used: number; startHP: number; endHP: number } | null;
  averageHitByLocation: Record<string, number>;
}

/**
 * Hook to calculate statistics for a specific hour
 * @param hour - Hour to calculate stats for (0-23)
 * @param date - Optional date to use (defaults to now)
 * @returns HourStats object with calculated statistics
 */
export const useHourStats = (hour: number, date?: Date): HourStats => {
  const { dataByHour } = useTrackedData();

  return useMemo(() => {
    if (!dataByHour) {
      return {
        totalExp: 0,
        expBySkill: {},
        dropStats: {},
        hpUsed: null,
        averageHitByLocation: {},
      };
    }

    try {
      const now = date || new Date();
      const hourData = dataByHour(hour, now);
      const sortedData = [...hourData].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      let totalExp = 0;
      const expBySkill: Record<string, number> = {};
      const dropStats: Record<string, { count: number; totalAmount: number }> = {};
      const averageHitByLocation: Record<string, { totalDamage: number; hitCount: number }> = {};

      // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
      // This matches the logic in aggregateStats used by the history tab
      const uniqueEntriesMap = new Map<string, CSVRow>();

      sortedData.forEach(row => {
        const skill = row.skill || '';
        const key = `${row.timestamp}-${skill}`;
        const existing = uniqueEntriesMap.get(key);

        if (!existing) {
          uniqueEntriesMap.set(key, row);
        } else {
          // Keep the one with higher gainedExp or more complete data
          const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
          const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;
          if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
            uniqueEntriesMap.set(key, row);
          }
        }
      });

      // Process unique entries only
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      uniqueEntries.forEach(row => {
        // Calculate exp - only count entries with gainedExp > 0
        const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        if (gainedExp > 0) {
          totalExp += gainedExp;

          const skill = row.skill || '';
          if (skill) {
            expBySkill[skill] = (expBySkill[skill] || 0) + gainedExp;
          }
        }

        // Calculate drops
        const drops = parseDrops(row.drops || '');
        drops.forEach(drop => {
          const { amount, name } = parseDropAmount(drop);
          if (!dropStats[name]) {
            dropStats[name] = { count: 0, totalAmount: 0 };
          }
          dropStats[name].count += 1;
          dropStats[name].totalAmount += amount;
        });

        // Calculate average hit by location
        const location = row.location || '';
        const damageDealtStr = row.damageDealt || '';
        if (location && damageDealtStr) {
          // Parse semicolon-separated damage values into array
          const damageValues = damageDealtStr
            .split(';')
            .map((d: string) => d.trim())
            .filter((d: string) => d.length > 0);

          if (damageValues.length > 0) {
            if (!averageHitByLocation[location]) {
              averageHitByLocation[location] = { totalDamage: 0, hitCount: 0 };
            }

            // Process each damage value (exclude misses/zeros from average calculation)
            damageValues.forEach((damageStr: string) => {
              const damage = parseInt(String(damageStr).replace(/,/g, ''), 10);
              if (!isNaN(damage) && damage > 0) {
                averageHitByLocation[location].totalDamage += damage;
                averageHitByLocation[location].hitCount += 1;
              }
              // Note: misses (0) are not counted in average hit calculation
            });
          }
        }
      });

      // Calculate HP used - use unique entries
      const hpEntries = uniqueEntries
        .filter(row => row.hp && row.hp.trim() !== '')
        .map(row => {
          const hpValue = parseInt(row.hp.replace(/,/g, ''), 10);
          return {
            timestamp: row.timestamp,
            hp: isNaN(hpValue) ? null : hpValue,
          };
        })
        .filter(entry => entry.hp !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let hpUsed: { used: number; startHP: number; endHP: number } | null = null;
      if (hpEntries.length >= 2) {
        const firstHP = hpEntries[0].hp!;
        const lastHP = hpEntries[hpEntries.length - 1].hp!;
        hpUsed = {
          used: firstHP - lastHP,
          startHP: firstHP,
          endHP: lastHP,
        };
      }

      // Calculate average hits
      const avgHits: Record<string, number> = {};
      Object.entries(averageHitByLocation).forEach(([location, stats]) => {
        if (stats.hitCount > 0) {
          avgHits[location] = stats.totalDamage / stats.hitCount;
        }
      });

      return {
        totalExp,
        expBySkill,
        dropStats,
        hpUsed,
        averageHitByLocation: avgHits,
      };
    } catch (error) {
      console.error('Error calculating hour stats:', error);
      return {
        totalExp: 0,
        expBySkill: {},
        dropStats: {},
        hpUsed: null,
        averageHitByLocation: {},
      };
    }
  }, [dataByHour, hour, date]);
};
