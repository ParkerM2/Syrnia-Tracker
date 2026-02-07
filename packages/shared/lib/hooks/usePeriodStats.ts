import { useFormatting } from './useFormatting.js';
import { useItemValuesQuery } from './useItemValuesQuery.js';
import { useTrackedDataQuery } from './useTrackedDataQuery.js';
import { useMemo, useState } from 'react';
import type { CSVRow, TimePeriod } from '../utils/csv-tracker.js';
import type { CombatExpGain } from '../utils/types.js';

export interface PeriodStats {
  periodKey: string;
  date: Date;
  totalGainedExp: number;
  skills: Record<string, number>;
  hpUsed: { used: number; startHP: number; endHP: number } | null;
  dropStats: Record<string, { count: number; totalAmount: number }>;
  lootItems: PeriodLootItem[];
  totalDrops: number;
  totalDropAmount: number;
  totalDropValue: number;
  hpValue: number;
  netProfit: number;
}

export interface PeriodLootItem {
  name: string;
  imageUrl: string;
  quantity: number;
  valuePerItem: number;
  totalValue: number;
}

export const usePeriodStats = (initialPeriod: TimePeriod = 'day') => {
  const { allData, loading } = useTrackedDataQuery();
  const { itemValues, loading: itemValuesLoading } = useItemValuesQuery();
  const { parseDrops, parseDropAmount } = useFormatting();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod);

  // Deduplicate all entries: one entry per timestamp+skill
  const allDeduplicatedData = useMemo(() => {
    const uniqueEntriesMap = new Map<string, CSVRow>();

    allData.forEach((row: CSVRow) => {
      const key = `${row.timestamp}-${row.skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, { ...row });
      } else {
        // Merge drops from both rows
        const existingDrops = existing.drops || '';
        const currentDrops = row.drops || '';
        const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== '').join(';');

        // Keep the one with higher gainedExp or most complete data
        const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || '0', 10) || 0;

        if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
          uniqueEntriesMap.set(key, { ...row, drops: mergedDrops });
        } else {
          uniqueEntriesMap.set(key, { ...existing, drops: mergedDrops });
        }
      }
    });

    return Array.from(uniqueEntriesMap.values());
  }, [allData]);

  // Filtered version for exp calculations
  const allDeduplicatedDataWithExp = useMemo(
    () => allDeduplicatedData.filter(row => parseInt(row.gainedExp || '0', 10) > 0),
    [allDeduplicatedData],
  );

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalEntries = allDeduplicatedData.length;
    const totalExp = allDeduplicatedDataWithExp.reduce(
      (sum, row) => sum + (parseInt(row.gainedExp || '0', 10) || 0),
      0,
    );

    let start: Date | null = null;
    let end: Date | null = null;

    if (allDeduplicatedData.length > 0) {
      const timestamps = allDeduplicatedData.map(d => new Date(d.timestamp).getTime());
      start = new Date(Math.min(...timestamps));
      end = new Date(Math.max(...timestamps));
    }

    return {
      totalEntries,
      totalExp,
      timeRange: { start, end },
    };
  }, [allDeduplicatedData, allDeduplicatedDataWithExp]);

  // Group and calculate stats
  const periodBreakdown = useMemo(() => {
    // Group ALL data (for drops/HP)
    const allDataPeriodMap = new Map<string, { periodKey: string; date: Date; rows: CSVRow[] }>();

    // Helper to get period key and date
    const getPeriodInfo = (date: Date) => {
      let periodKey: string;
      let periodDate: Date;

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const hour = date.getUTCHours();

      if (selectedPeriod === 'hour') {
        periodKey = `${year}-${month}-${day}-${hour}`;
        periodDate = new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
      } else if (selectedPeriod === 'day') {
        periodKey = `${year}-${month}-${day}`;
        periodDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      } else if (selectedPeriod === 'week') {
        const weekStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const weekday = weekStart.getUTCDay();
        weekStart.setUTCDate(weekStart.getUTCDate() - weekday);
        weekStart.setUTCHours(0, 0, 0, 0);
        periodKey = `${weekStart.getUTCFullYear()}-${weekStart.getUTCMonth()}-${weekStart.getUTCDate()}`;
        periodDate = weekStart;
      } else {
        periodKey = `${year}-${month}`;
        periodDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      }
      return { periodKey, periodDate };
    };

    allDeduplicatedData.forEach(row => {
      const date = new Date(row.timestamp);
      const { periodKey, periodDate } = getPeriodInfo(date);

      if (!allDataPeriodMap.has(periodKey)) {
        allDataPeriodMap.set(periodKey, { periodKey, date: periodDate, rows: [] });
      }
      allDataPeriodMap.get(periodKey)!.rows.push(row);
    });

    // Group filtered data (for exp)
    const periodMap = new Map<string, { periodKey: string; date: Date; rows: CSVRow[] }>();
    allDeduplicatedDataWithExp.forEach(row => {
      const date = new Date(row.timestamp);
      const { periodKey, periodDate } = getPeriodInfo(date);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { periodKey, date: periodDate, rows: [] });
      }
      periodMap.get(periodKey)!.rows.push(row);
    });

    // Calculate stats
    return Array.from(allDataPeriodMap.values())
      .map(({ periodKey, date, rows: allRows }) => {
        const expRows = periodMap.get(periodKey)?.rows || [];

        // EXP Calculation
        let totalGainedExp = 0;
        const skills: Record<string, number> = {};

        expRows.forEach(row => {
          const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;
          const mainSkill = row.skill || '';

          if (gainedExp > 0) {
            totalGainedExp += gainedExp;
            if (mainSkill) {
              skills[mainSkill] = (skills[mainSkill] || 0) + gainedExp;
            }
          }

          if (row.combatExp && row.combatExp.trim() !== '') {
            try {
              const combatExpGains: CombatExpGain[] = JSON.parse(row.combatExp);
              if (Array.isArray(combatExpGains)) {
                combatExpGains.forEach((gain: CombatExpGain) => {
                  const skill = gain.skill || '';
                  const exp = parseInt(gain.exp || '0', 10) || 0;
                  if (skill && exp > 0 && skill !== mainSkill) {
                    totalGainedExp += exp;
                    skills[skill] = (skills[skill] || 0) + exp;
                  }
                });
              }
            } catch {
              // Ignore errors
            }
          }
        });

        // HP Used Calculation
        let totalHpUsed = 0;
        allRows.forEach((row: CSVRow) => {
          if (row.hpUsed && row.hpUsed.trim() !== '') {
            const hpUsedValue = parseInt(row.hpUsed.replace(/,/g, ''), 10);
            if (!isNaN(hpUsedValue) && hpUsedValue > 0) {
              totalHpUsed += hpUsedValue;
            }
          }
        });

        const hpEntries = allRows
          .filter(row => row.totalInventoryHP && row.totalInventoryHP.trim() !== '')
          .map(row => ({
            timestamp: row.timestamp,
            hp: parseInt(row.totalInventoryHP.replace(/,/g, ''), 10),
          }))
          .filter(entry => !isNaN(entry.hp))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let hpUsed: { used: number; startHP: number; endHP: number } | null = null;
        if (totalHpUsed > 0) {
          const startHP = hpEntries.length > 0 ? hpEntries[0].hp : 0;
          const endHP = hpEntries.length > 0 ? hpEntries[hpEntries.length - 1].hp : 0;
          hpUsed = { used: totalHpUsed, startHP, endHP };
        } else if (hpEntries.length >= 2) {
          const firstHP = hpEntries[0].hp;
          const lastHP = hpEntries[hpEntries.length - 1].hp;
          hpUsed = { used: firstHP - lastHP, startHP: firstHP, endHP: lastHP };
        }

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

        // Drops Calculation
        const dropStats: Record<string, { count: number; totalAmount: number }> = {};
        allRows.forEach((row: CSVRow) => {
          const drops = parseDrops(row.drops || '');
          drops.forEach((drop: string) => {
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
        });

        const totalDrops = Object.values(dropStats).reduce((sum, stat) => sum + stat.count, 0);
        const totalDropAmount = Object.values(dropStats).reduce((sum, stat) => sum + stat.totalAmount, 0);

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

        return {
          periodKey,
          date,
          totalGainedExp,
          skills,
          hpUsed,
          dropStats,
          lootItems,
          totalDrops,
          totalDropAmount,
          totalDropValue,
          hpValue,
          netProfit,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allDeduplicatedData, allDeduplicatedDataWithExp, selectedPeriod, itemValues, parseDrops, parseDropAmount]);

  return {
    periodBreakdown,
    selectedPeriod,
    setSelectedPeriod,
    loading: loading || itemValuesLoading,
    itemValues,
    overallStats,
  };
};
