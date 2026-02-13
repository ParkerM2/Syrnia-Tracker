import {
  formatDayHeader,
  formatHourHeader,
  formatMonthHeader,
  formatWeekHeader,
  formatYearHeader,
  getDayStart,
  getHourStart,
  getMonthStart,
  getTimeGroupKey,
  getWeekStart,
  getYearStart,
  parseDamageReceived,
} from "./helpers/lootHelpers";
import { useTrackedDataQuery, useFormatting, useItemValuesQuery } from "@app/hooks";
import { useMemo, useState, useCallback } from "react";

export type SortOption = "alphabetical" | "totalValue";
export type TimeFilterOption = "none" | "hour" | "day" | "week" | "month" | "year";
export type SourceFilterOption = "all" | "drops" | "produced";

export interface LootEntry {
  timestamp: string;
  name: string;
  quantity: number;
  valuePerItem: number;
  totalValue: number;
  location: string;
  monster: string;
  imageUrl: string;
  source: "drop" | "produced";
}

export interface LootGroup {
  header: string;
  entries: LootEntry[];
  totalCost: number;
}

/**
 * Main hook for LootMap component
 * Handles all logic, state, and data processing
 */
export const useLootMap = () => {
  const { allData, loading } = useTrackedDataQuery();
  const { parseDrops, parseDropAmount } = useFormatting();
  const { itemValues, save, isSaving } = useItemValuesQuery();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempItemValues, setTempItemValues] = useState<Record<string, string>>({});
  const [filterMonster, setFilterMonster] = useState<string>("none");
  const [filterLocation, setFilterLocation] = useState<string>("none");
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("none");
  const [sortOption, setSortOption] = useState<SortOption>("totalValue");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>("all");

  // Extract all loot entries from all data (drops + produced items)
  const allLootEntries = useMemo(() => {
    const entries: LootEntry[] = [];

    // Sort rows by timestamp ascending for delta calculation
    const sortedData = [...allData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Track previous quantities for actionOutput delta computation
    const previousQuantities = new Map<string, number>();

    sortedData.forEach(row => {
      // Process drops
      const drops = parseDrops(row.drops || "");
      drops.forEach(drop => {
        const trimmedDrop = drop.trim();
        if (!trimmedDrop || trimmedDrop.length === 0) return;
        if (/^[\d,]+$/.test(trimmedDrop)) return;

        const { amount, name } = parseDropAmount(drop);
        const trimmedName = name?.trim() || "";

        if (
          !trimmedName ||
          trimmedName.toLowerCase().includes("experience") ||
          trimmedName.toLowerCase().includes("exp ") ||
          /^\d+\s*exp$/i.test(trimmedName)
        ) {
          return;
        }

        const itemValue = parseFloat(itemValues[name] || "0") || 0;
        const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, "%20")}.png`;

        entries.push({
          timestamp: row.timestamp,
          name,
          quantity: amount,
          valuePerItem: itemValue,
          totalValue: amount * itemValue,
          location: row.location?.trim() || "Unknown",
          monster: row.monster?.trim() || "Unknown",
          imageUrl,
          source: "drop",
        });
      });

      // Process actionOutput (produced items) — compute deltas from running totals
      if (row.actionOutput && row.actionOutput.trim() !== "" && row.actionOutput !== "[]") {
        try {
          const outputs: Array<{ item: string; quantity: number }> = JSON.parse(row.actionOutput);
          if (Array.isArray(outputs)) {
            outputs.forEach(output => {
              if (!output.item || output.quantity <= 0) return;

              const prev = previousQuantities.get(output.item);
              previousQuantities.set(output.item, output.quantity);

              // First occurrence is baseline — no entry created
              if (prev === undefined) return;

              const delta = output.quantity - prev;
              if (delta <= 0) return;

              const itemValue = parseFloat(itemValues[output.item] || "0") || 0;
              const imageUrl = `https://www.syrnia.com/images/inventory/${output.item.replace(/\s/g, "%20")}.png`;

              entries.push({
                timestamp: row.timestamp,
                name: output.item,
                quantity: delta,
                valuePerItem: itemValue,
                totalValue: delta * itemValue,
                location: "",
                monster: "",
                imageUrl,
                source: "produced",
              });
            });
          }
        } catch {
          // Silently handle JSON parse errors
        }
      }
    });

    return entries;
  }, [allData, parseDrops, parseDropAmount, itemValues]);

  // Get unique monsters and locations for filters
  const uniqueMonsters = useMemo(() => {
    const monsters = new Set<string>();
    allLootEntries.forEach(entry => {
      if (entry.monster && entry.monster !== "Unknown") {
        monsters.add(entry.monster);
      }
    });
    return Array.from(monsters).sort();
  }, [allLootEntries]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    allLootEntries.forEach(entry => {
      if (entry.location && entry.location !== "Unknown") {
        locations.add(entry.location);
      }
    });
    return Array.from(locations).sort();
  }, [allLootEntries]);

  // Filter loot entries
  const filteredLootEntries = useMemo(() => {
    let filtered = [...allLootEntries];

    // Apply source filter
    if (sourceFilter === "drops") {
      filtered = filtered.filter(entry => entry.source === "drop");
    } else if (sourceFilter === "produced") {
      filtered = filtered.filter(entry => entry.source === "produced");
    }

    // Apply monster filter
    if (filterMonster !== "none") {
      filtered = filtered.filter(entry => entry.monster === filterMonster);
    }

    // Apply location filter
    if (filterLocation !== "none") {
      filtered = filtered.filter(entry => entry.location === filterLocation);
    }

    return filtered;
  }, [allLootEntries, sourceFilter, filterMonster, filterLocation]);

  // Compute HP cost (damageReceived * 2.5 GP) per time group from raw data
  const costByTimeGroup = useMemo(() => {
    const map = new Map<string, number>();

    allData.forEach(row => {
      if (!row.damageReceived) return;

      // Apply same monster/location filters as loot entries
      if (filterMonster !== "none" && row.monster?.trim() !== filterMonster) return;
      if (filterLocation !== "none" && row.location?.trim() !== filterLocation) return;

      const damage = parseDamageReceived(row.damageReceived);
      if (damage <= 0) return;

      const key = getTimeGroupKey(row.timestamp, timeFilter);
      map.set(key, (map.get(key) || 0) + damage);
    });

    return map;
  }, [allData, timeFilter, filterMonster, filterLocation]);

  // Sort and group loot entries
  const sortedAndGroupedLoot = useMemo(() => {
    const entries = [...filteredLootEntries];

    // Helper function to sort entries by sort option
    const sortEntries = (entriesToSort: LootEntry[]): LootEntry[] => {
      const sorted = [...entriesToSort];
      switch (sortOption) {
        case "alphabetical":
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "totalValue":
          sorted.sort((a, b) => {
            if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue; // Highest value first
            return a.name.localeCompare(b.name); // Then alphabetical
          });
          break;
      }
      return sorted;
    };

    // Helper: build a group with cost attached
    const buildGroup = (key: string, header: string, groupEntries: LootEntry[]): LootGroup => ({
      header,
      entries: sortEntries(groupEntries),
      totalCost: (costByTimeGroup.get(key) || 0) * 2.5,
    });

    // Helper: group entries by a time function, format headers, attach costs
    const groupByTime = (getStart: (ts: string) => string, formatHeader: (ts: string) => string): LootGroup[] => {
      const grouped = new Map<string, LootEntry[]>();
      entries.forEach(entry => {
        const key = getStart(entry.timestamp);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(entry);
      });
      return Array.from(grouped.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, groupEntries]) => buildGroup(key, formatHeader(key), groupEntries));
    };

    // Group by time filter
    switch (timeFilter) {
      case "hour":
        return groupByTime(getHourStart, formatHourHeader);
      case "day":
        return groupByTime(getDayStart, formatDayHeader);
      case "week":
        return groupByTime(getWeekStart, formatWeekHeader);
      case "month":
        return groupByTime(getMonthStart, formatMonthHeader);
      case "year":
        return groupByTime(getYearStart, formatYearHeader);
      default:
        return [buildGroup("", "", entries)];
    }
  }, [filteredLootEntries, sortOption, timeFilter, costByTimeGroup]);

  // Get all unique item names for settings
  const allUniqueItems = useMemo(() => {
    const items = new Set<string>();
    allLootEntries.forEach(entry => {
      items.add(entry.name);
    });
    return Array.from(items).sort();
  }, [allLootEntries]);

  // Handle settings dialog
  const handleOpenSettings = useCallback(() => {
    setTempItemValues({ ...itemValues });
    setIsSettingsOpen(true);
  }, [itemValues]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setTempItemValues({});
  }, []);

  const handleSaveItemValues = useCallback(async () => {
    try {
      await save(tempItemValues);
      setIsSettingsOpen(false);
    } catch {
      alert("Error saving item values");
    }
  }, [tempItemValues, save]);

  const handleItemValueChange = useCallback((itemName: string, value: string) => {
    setTempItemValues(prev => ({
      ...prev,
      [itemName]: value,
    }));
  }, []);

  return {
    // State
    loading,
    sourceFilter,
    setSourceFilter,
    filterMonster,
    setFilterMonster,
    filterLocation,
    setFilterLocation,
    timeFilter,
    setTimeFilter,
    sortOption,
    setSortOption,
    isSettingsOpen,
    setIsSettingsOpen,
    tempItemValues,
    isSaving,
    allUniqueItems,
    itemValues,

    // Data
    uniqueMonsters,
    uniqueLocations,
    sortedAndGroupedLoot,
    filteredLootEntries,

    // Handlers
    handleOpenSettings,
    handleCloseSettings,
    handleSaveItemValues,
    handleItemValueChange,
  };
};
