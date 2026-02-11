/* eslint-disable import-x/exports-last */
import { parseDrops, parseDropAmount } from "./formatting";
import type { CSVRow } from "./csv-tracker";
import type { CombatExpGain } from "@app/types";

// --- Types ---

export interface LootItem {
  name: string;
  imageUrl: string;
  quantity: number;
  valuePerItem: number;
  totalValue: number;
}

export interface ProducedItem extends LootItem {
  skill: string;
}

export interface AggregatedStats {
  totalExp: number;
  expBySkill: Record<string, number>;
  skillLevels: Record<string, number>;
  totalDamageReceived: number;
  totalDamageDealt: number;
  foodUsed: number;
  hpUsed: { used: number; startHP: number; endHP: number } | null;
  drops: LootItem[];
  totalDropValue: number;
  producedItems: ProducedItem[];
  totalProducedValue: number;
  netProfit: number;
  totalFights: number;
  totalSkillingActions: number;
  avgExpPerHour: number;
  timeRange: { start: Date; end: Date } | null;
}

// --- Helpers ---

const isValidDrop = (drop: string, name: string): boolean => {
  const trimmedDrop = drop.trim();
  if (!trimmedDrop) return false;
  if (/^[\d,]+$/.test(trimmedDrop)) return false;
  const trimmedName = name?.trim() || "";
  if (!trimmedName) return false;
  const lower = trimmedName.toLowerCase();
  if (lower.includes("experience") || lower.includes("exp ") || /^\d+\s*exp$/i.test(trimmedName)) {
    return false;
  }
  return true;
};

/**
 * Deduplicate CSVRows by UUID+skill (primary) with timestamp+skill fallback.
 * Merges drops, damage dealt, and damage received from duplicate entries.
 */
export const deduplicateRows = (rows: CSVRow[]): CSVRow[] => {
  const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const map = new Map<string, CSVRow>();

  sorted.forEach(row => {
    const skill = row.skill || "";
    const uuid = row.uuid || "";
    const key = uuid ? `${uuid}-${skill}` : `${row.timestamp}-${skill}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, row);
    } else {
      const existingExp = parseInt(existing.gainedExp || "0", 10) || 0;
      const currentExp = parseInt(row.gainedExp || "0", 10) || 0;

      const mergedDrops = [existing.drops || "", row.drops || ""].filter(d => d.trim() !== "").join(";");
      const mergedDealt = [existing.damageDealt || "", row.damageDealt || ""].filter(d => d.trim() !== "").join(";");
      const mergedReceived = [existing.damageReceived || "", row.damageReceived || ""]
        .filter(d => d.trim() !== "")
        .join(";");

      const better = currentExp > existingExp || (currentExp === existingExp && row.skillLevel) ? row : existing;

      map.set(key, {
        ...better,
        drops: mergedDrops || better.drops,
        damageDealt: mergedDealt || better.damageDealt,
        damageReceived: mergedReceived || better.damageReceived,
        hp: row.hp || existing.hp,
        location: row.location || existing.location,
        monster: row.monster || existing.monster,
      });
    }
  });

  return Array.from(map.values());
};

/**
 * Filter rows to a date range (inclusive).
 */
export const filterRowsByRange = (rows: CSVRow[], start: Date, end: Date): CSVRow[] => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return rows.filter(row => {
    const t = new Date(row.timestamp).getTime();
    return t >= startTime && t <= endTime;
  });
};

/**
 * Quick exp-only aggregation (lighter than full aggregateRows).
 */
export const aggregateExp = (rows: CSVRow[]): { totalExp: number; expBySkill: Record<string, number> } => {
  let totalExp = 0;
  const expBySkill: Record<string, number> = {};

  rows.forEach(row => {
    const gainedExp = parseInt(row.gainedExp || "0", 10) || 0;
    const mainSkill = row.skill || "";

    if (gainedExp > 0) {
      totalExp += gainedExp;
      if (mainSkill) {
        expBySkill[mainSkill] = (expBySkill[mainSkill] || 0) + gainedExp;
      }
    }

    if (row.combatExp && row.combatExp.trim() !== "") {
      try {
        const gains: CombatExpGain[] = JSON.parse(row.combatExp);
        if (Array.isArray(gains)) {
          gains.forEach(gain => {
            const skill = gain.skill || "";
            const exp = parseInt(gain.exp || "0", 10) || 0;
            if (skill && exp > 0 && skill !== mainSkill) {
              totalExp += exp;
              expBySkill[skill] = (expBySkill[skill] || 0) + exp;
            }
          });
        }
      } catch {
        // Silently handle JSON parse errors
      }
    }
  });

  return { totalExp, expBySkill };
};

/**
 * Full aggregation of CSVRows into comprehensive stats.
 * Single pass over rows for exp, drops, damage, HP, items produced, fights, etc.
 */
export const aggregateRows = (rows: CSVRow[], itemValues: Record<string, string>): AggregatedStats => {
  if (rows.length === 0) {
    return {
      totalExp: 0,
      expBySkill: {},
      skillLevels: {},
      totalDamageReceived: 0,
      totalDamageDealt: 0,
      foodUsed: 0,
      hpUsed: null,
      drops: [],
      totalDropValue: 0,
      producedItems: [],
      totalProducedValue: 0,
      netProfit: 0,
      totalFights: 0,
      totalSkillingActions: 0,
      avgExpPerHour: 0,
      timeRange: null,
    };
  }

  let totalExp = 0;
  let totalFights = 0;
  let totalSkillingActions = 0;
  let totalDamageReceived = 0;
  let totalDamageDealt = 0;
  let totalHpUsed = 0;
  const expBySkill: Record<string, number> = {};
  const skillLevels: Record<string, number> = {};
  const dropStats: Record<string, { count: number; totalAmount: number }> = {};
  const itemsProducedTracking: Record<string, { min: number; max: number; skill: string }> = {};
  const fightKeys = new Set<string>();

  rows.forEach(row => {
    const gainedExp = parseInt(row.gainedExp || "0", 10) || 0;
    const mainSkill = row.skill || "";
    const parsedLevel = parseInt(row.skillLevel || "0", 10) || 0;
    if (mainSkill && parsedLevel > 0) {
      skillLevels[mainSkill] = Math.max(skillLevels[mainSkill] || 0, parsedLevel);
    }

    // Exp
    if (gainedExp > 0) {
      totalExp += gainedExp;
      if (mainSkill) {
        expBySkill[mainSkill] = (expBySkill[mainSkill] || 0) + gainedExp;
      }
    }

    // Secondary combat exp
    if (row.combatExp && row.combatExp.trim() !== "") {
      try {
        const gains: CombatExpGain[] = JSON.parse(row.combatExp);
        if (Array.isArray(gains)) {
          gains.forEach(gain => {
            const skill = gain.skill || "";
            const exp = parseInt(gain.exp || "0", 10) || 0;
            if (skill && exp > 0 && skill !== mainSkill) {
              totalExp += exp;
              expBySkill[skill] = (expBySkill[skill] || 0) + exp;
            }
          });
        }
      } catch {
        // Silently handle JSON parse errors
      }
    }

    // Drops
    const drops = parseDrops(row.drops || "");
    drops.forEach(drop => {
      const { amount, name } = parseDropAmount(drop);
      if (!isValidDrop(drop, name)) return;
      if (!dropStats[name]) {
        dropStats[name] = { count: 0, totalAmount: 0 };
      }
      dropStats[name].count += 1;
      dropStats[name].totalAmount += amount;
    });

    // Fights — deduplicate by monster + rounded timestamp
    const fights = parseInt(row.totalFights || "0", 10) || 0;
    if (fights > 0) {
      const monster = row.monster || "unknown";
      const ts = new Date(row.timestamp);
      const rounded = new Date(
        ts.getFullYear(),
        ts.getMonth(),
        ts.getDate(),
        ts.getHours(),
        ts.getMinutes(),
        ts.getSeconds(),
      );
      const fightKey = `${monster}-${rounded.toISOString()}`;
      if (!fightKeys.has(fightKey)) {
        fightKeys.add(fightKey);
        totalFights += 1;
      }
    }

    // Skilling actions
    if (row.actionType === "skilling") {
      const hasExp = parseInt(row.gainedExp || "0", 10) > 0;
      const hasOutput = row.actionOutput && row.actionOutput.trim() !== "" && row.actionOutput !== "[]";
      if (hasExp || hasOutput) {
        totalSkillingActions += 1;
      }
    }

    // Items produced (min/max tracking)
    if (row.actionOutput && row.actionOutput.trim() !== "" && row.actionOutput !== "[]") {
      try {
        const outputs: Array<{ item: string; quantity: number }> = JSON.parse(row.actionOutput);
        if (Array.isArray(outputs)) {
          outputs.forEach(output => {
            if (output.item && output.quantity > 0) {
              const existing = itemsProducedTracking[output.item];
              if (existing) {
                existing.min = Math.min(existing.min, output.quantity);
                existing.max = Math.max(existing.max, output.quantity);
              } else {
                itemsProducedTracking[output.item] = {
                  min: output.quantity,
                  max: output.quantity,
                  skill: row.skill || "",
                };
              }
            }
          });
        }
      } catch {
        // Silently handle JSON parse errors
      }
    }

    // Damage received
    if (row.damageReceived && row.damageReceived.trim() !== "") {
      row.damageReceived.split(";").forEach(dmg => {
        const val = parseInt(dmg.trim(), 10);
        if (!isNaN(val) && val > 0) {
          totalDamageReceived += val;
        }
      });
    }

    // Damage dealt
    if (row.damageDealt && row.damageDealt.trim() !== "") {
      row.damageDealt.split(";").forEach(dmg => {
        const val = parseInt(dmg.trim(), 10);
        if (!isNaN(val) && val > 0) {
          totalDamageDealt += val;
        }
      });
    }

    // HP used from fight log
    if (row.hpUsed && row.hpUsed.trim() !== "") {
      const hpVal = parseInt(row.hpUsed.replace(/,/g, ""), 10);
      if (!isNaN(hpVal) && hpVal > 0) {
        totalHpUsed += hpVal;
      }
    }
  });

  // HP used calculation (display)
  const hpEntries = rows
    .filter(row => row.totalInventoryHP && row.totalInventoryHP.trim() !== "")
    .map(row => ({
      timestamp: row.timestamp,
      hp: parseInt(row.totalInventoryHP.replace(/,/g, ""), 10),
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

  // Loot items
  const lootItems: LootItem[] = Object.entries(dropStats)
    .map(([name, stats]) => {
      const valuePerItem = parseFloat(itemValues[name] || "0") || 0;
      const totalValue = stats.totalAmount * valuePerItem;
      const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, "%20")}.png`;
      return { name, imageUrl, quantity: stats.totalAmount, valuePerItem, totalValue };
    })
    .sort((a, b) => {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return a.name.localeCompare(b.name);
    });

  const totalDropValue = lootItems.reduce((sum, item) => sum + item.totalValue, 0);

  // Produced items
  const producedItems: ProducedItem[] = Object.entries(itemsProducedTracking)
    .map(([name, data]) => {
      const produced = data.max - data.min;
      if (produced <= 0) return null;
      const valuePerItem = parseFloat(itemValues[name] || "0") || 0;
      const totalValue = produced * valuePerItem;
      const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, "%20")}.png`;
      return { name, imageUrl, quantity: produced, valuePerItem, totalValue, skill: data.skill };
    })
    .filter((item): item is ProducedItem => item !== null)
    .sort((a, b) => {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return a.name.localeCompare(b.name);
    });

  const totalProducedValue = producedItems.reduce((sum, item) => sum + item.totalValue, 0);

  // Net profit: revenue (drops + produced) - cost (damageReceived * 2.5)
  const foodUsed = totalDamageReceived * 2.5;
  const netProfit = totalDropValue + totalProducedValue - foodUsed;

  // Time range + avg exp/hr
  const timestamps = rows.map(r => new Date(r.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = { start: new Date(minTime), end: new Date(maxTime) };
  const hours = Math.max((maxTime - minTime) / (1000 * 60 * 60), 1 / 60); // min 1 minute
  const avgExpPerHour = totalExp / hours;

  return {
    totalExp,
    expBySkill,
    skillLevels,
    totalDamageReceived,
    totalDamageDealt,
    foodUsed,
    hpUsed,
    drops: lootItems,
    totalDropValue,
    producedItems,
    totalProducedValue,
    netProfit,
    totalFights,
    totalSkillingActions,
    avgExpPerHour,
    timeRange,
  };
};
