import { useItemValuesQuery } from './useItemValuesQuery.js';
import { useTrackedDataQuery } from './useTrackedDataQuery.js';
import { parseDrops, parseDropAmount } from '../utils/formatting.js';
import { useMemo } from 'react';
import type { CSVRow } from '../utils/csv-tracker.js';
import type { CombatExpGain } from '../utils/types.js';

export interface HourStats {
  totalExp: number;
  expBySkill: Record<string, number>;
  dropStats: Record<string, { count: number; totalAmount: number }>;
  lootItems: HourLootItem[];
  totalDropValue: number;
  hpValue: number;
  netProfit: number;
  hpUsed: { used: number; startHP: number; endHP: number } | null;
  averageHitByLocation: Record<string, number>;
  totalFights: number;
}

export interface HourLootItem {
  name: string;
  imageUrl: string;
  quantity: number;
  valuePerItem: number;
  totalValue: number;
}

/**
 * Hook to calculate statistics for a specific hour
 *
 * DATA SOURCE: tracked_data_csv (via useTrackedDataQuery)
 * This calculates hour stats from tracked screen data, NOT from stats page.
 *
 * @param hour - Hour to calculate stats for (0-23)
 * @param date - Optional date to use (defaults to now)
 * @returns HourStats object with calculated statistics (exp, drops, HP, damage)
 */
export const useHourStats = (hour: number, date?: Date): HourStats => {
  // dataByHour comes from tracked_data_csv via useTrackedDataQuery
  const { dataByHour } = useTrackedDataQuery();
  const { itemValues } = useItemValuesQuery();

  return useMemo(() => {
    if (!dataByHour) {
      return {
        totalExp: 0,
        expBySkill: {},
        dropStats: {},
        lootItems: [],
        totalDropValue: 0,
        hpValue: 0,
        netProfit: 0,
        hpUsed: null,
        averageHitByLocation: {},
        totalFights: 0,
      };
    }

    try {
      const isValidDrop = (drop: string, name: string) => {
        const trimmedDrop = drop.trim();
        if (!trimmedDrop) return false;
        if (/^[\d,]+$/.test(trimmedDrop)) return false;
        const trimmedName = name?.trim() || '';
        if (!trimmedName) return false;
        const lower = trimmedName.toLowerCase();
        if (lower.includes('experience') || lower.includes('exp ') || /^\d+\s*exp$/i.test(trimmedName)) {
          return false;
        }
        return true;
      };

      const now = date || new Date();
      const hourData = dataByHour(hour, now);

      const sortedData = [...hourData].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      let totalExp = 0;
      let totalFights = 0;
      const expBySkill: Record<string, number> = {};
      const dropStats: Record<string, { count: number; totalAmount: number }> = {};
      const averageHitByLocation: Record<string, { totalDamage: number; hitCount: number }> = {};

      // Deduplicate entries by UUID+skill to prevent counting the same fight multiple times
      // Each unique fight should be counted once, but sum all gainedExp values
      const uniqueEntriesMap = new Map<string, CSVRow>();

      sortedData.forEach(row => {
        const skill = row.skill || '';
        const uuid = row.uuid || '';

        // Use UUID+skill as key if UUID exists (prevents counting same fight twice)
        // Otherwise use timestamp+skill (fallback for old data)
        const key = uuid ? `${uuid}-${skill}` : `${row.timestamp}-${skill}`;
        const existing = uniqueEntriesMap.get(key);

        if (!existing) {
          // First time seeing this fight - add it
          uniqueEntriesMap.set(key, row);
        } else {
          // Same fight (same UUID) - merge data but keep the one with higher gainedExp
          const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
          const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;

          // Merge drops
          const existingDrops = existing.drops || '';
          const currentDrops = row.drops || '';
          const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== '').join(';');

          // Merge damage dealt
          const existingDamageDealt = existing.damageDealt || '';
          const currentDamageDealt = row.damageDealt || '';
          const mergedDamageDealt = [existingDamageDealt, currentDamageDealt]
            .filter(d => d && d.trim() !== '')
            .join(';');

          // Merge damage received
          const existingDamageReceived = existing.damageReceived || '';
          const currentDamageReceived = row.damageReceived || '';
          const mergedDamageReceived = [existingDamageReceived, currentDamageReceived]
            .filter(d => d && d.trim() !== '')
            .join(';');

          // Choose the better row (higher exp or more complete), but use merged data
          const betterRow =
            currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)
              ? row
              : existing;

          uniqueEntriesMap.set(key, {
            ...betterRow,
            drops: mergedDrops || betterRow.drops,
            damageDealt: mergedDamageDealt || betterRow.damageDealt,
            damageReceived: mergedDamageReceived || betterRow.damageReceived,
            // Use the most recent HP value
            hp: row.hp || existing.hp,
            // Use the most complete location/monster info
            location: row.location || existing.location,
            monster: row.monster || existing.monster,
          });
        }
      });

      // Process unique entries only
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      // Deduplicate fights by monster + rounded timestamp to prevent double counting
      const fightKeys = new Set<string>();

      uniqueEntries.forEach(row => {
        // Calculate exp - only count entries with gainedExp > 0
        const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;
        const rowSkill = row.skill || '';

        if (gainedExp > 0) {
          totalExp += gainedExp;

          if (rowSkill) {
            expBySkill[rowSkill] = (expBySkill[rowSkill] || 0) + gainedExp;
          }
        }

        // Parse and add secondary exp (combatExp) from the row
        // IMPORTANT: Skip the main skill if it appears in combatExp, since its exp
        // is already calculated from total exp delta and stored in gainedExp
        if (row.combatExp && row.combatExp.trim() !== '') {
          try {
            const combatExpGains: CombatExpGain[] = JSON.parse(row.combatExp);
            if (Array.isArray(combatExpGains)) {
              combatExpGains.forEach((gain: CombatExpGain) => {
                const combatSkill = gain.skill || '';
                const exp = parseInt(gain.exp || '0', 10) || 0;
                // Skip if this is the main skill - its exp is already in gainedExp (calculated from total exp delta)
                if (combatSkill && exp > 0 && combatSkill !== rowSkill) {
                  totalExp += exp;
                  expBySkill[combatSkill] = (expBySkill[combatSkill] || 0) + exp;
                }
              });
            }
          } catch {
            // Silently handle JSON parse errors
          }
        }

        // Calculate drops
        const drops = parseDrops(row.drops || '');
        drops.forEach(drop => {
          const { amount, name } = parseDropAmount(drop);
          if (!isValidDrop(drop, name)) {
            return;
          }
          if (!dropStats[name]) {
            dropStats[name] = { count: 0, totalAmount: 0 };
          }
          dropStats[name].count += 1;
          dropStats[name].totalAmount += amount;
        });

        // Calculate total fights - deduplicate by monster + rounded timestamp
        const fights = parseInt(row.totalFights || '0', 10) || 0;
        if (fights > 0) {
          const monster = row.monster || 'unknown';
          const timestamp = new Date(row.timestamp);
          // Round timestamp to nearest second to group rapid scrapes together
          const roundedTimestamp = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours(),
            timestamp.getMinutes(),
            timestamp.getSeconds(),
          );
          const fightKey = `${monster}-${roundedTimestamp.toISOString()}`;

          // Only count this fight if we haven't seen it before
          if (!fightKeys.has(fightKey)) {
            fightKeys.add(fightKey);
            totalFights += 1;
          }
        }

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

      // Calculate HP used from fight log (sum all hpUsed values)
      let totalHpUsed = 0;
      uniqueEntries.forEach(row => {
        if (row.hpUsed && row.hpUsed.trim() !== '') {
          const hpUsedValue = parseInt(row.hpUsed.replace(/,/g, ''), 10);
          if (!isNaN(hpUsedValue) && hpUsedValue > 0) {
            totalHpUsed += hpUsedValue;
          }
        }
      });

      // Get totalInventoryHP for start/end (for display purposes)
      const hpEntries = uniqueEntries
        .filter(row => row.totalInventoryHP && row.totalInventoryHP.trim() !== '')
        .map(row => {
          const hpValue = parseInt(row.totalInventoryHP.replace(/,/g, ''), 10);
          return {
            timestamp: row.timestamp,
            hp: isNaN(hpValue) ? null : hpValue,
          };
        })
        .filter(entry => entry.hp !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let hpUsed: { used: number; startHP: number; endHP: number } | null = null;
      if (totalHpUsed > 0) {
        const startHP = hpEntries.length > 0 ? hpEntries[0].hp! : 0;
        const endHP = hpEntries.length > 0 ? hpEntries[hpEntries.length - 1].hp! : 0;
        hpUsed = {
          used: totalHpUsed,
          startHP,
          endHP,
        };
      } else if (hpEntries.length >= 2) {
        // Fallback to old calculation if no hpUsed from fight log
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

      const lootItems = Object.entries(dropStats)
        .map(([name, stats]) => {
          const valuePerItem = parseFloat(itemValues[name] || '0') || 0;
          const totalValue = stats.totalAmount * valuePerItem;
          const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, '%20')}.png`;
          return {
            name,
            imageUrl,
            quantity: stats.totalAmount,
            valuePerItem,
            totalValue,
          };
        })
        .sort((a, b) => {
          if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
          return a.name.localeCompare(b.name);
        });

      const totalDropValue = lootItems.reduce((sum, item) => sum + item.totalValue, 0);
      const hpValue = hpUsed ? hpUsed.used * 2.5 : 0;
      const netProfit = totalDropValue - hpValue;

      const result = {
        totalExp,
        expBySkill,
        dropStats,
        lootItems,
        totalDropValue,
        hpValue,
        netProfit,
        hpUsed,
        averageHitByLocation: avgHits,
        totalFights,
      };

      return result;
    } catch {
      return {
        totalExp: 0,
        expBySkill: {},
        dropStats: {},
        lootItems: [],
        totalDropValue: 0,
        hpValue: 0,
        netProfit: 0,
        hpUsed: null,
        averageHitByLocation: {},
        totalFights: 0,
      };
    }
  }, [dataByHour, hour, date, itemValues]);
};
