import {
  formatDayHeader,
  formatWeekHeader,
  formatHourHeader,
  getDayStart,
  getWeekStart,
  getHourStart,
} from './helpers/lootHelpers';
import { useTrackedDataQuery, useFormatting, useItemValuesQuery } from '@extension/shared';
import { useMemo, useState, useCallback } from 'react';

export type SortOption = 'alphabetical' | 'totalValue';
export type TimeFilterOption = 'none' | 'day' | 'week' | 'hour';

export interface LootEntry {
  timestamp: string;
  name: string;
  quantity: number;
  valuePerItem: number;
  totalValue: number;
  location: string;
  monster: string;
  imageUrl: string;
}

export interface LootGroup {
  header: string;
  entries: LootEntry[];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonster, setFilterMonster] = useState<string>('none');
  const [filterLocation, setFilterLocation] = useState<string>('none');
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('none');
  const [sortOption, setSortOption] = useState<SortOption>('totalValue');

  // Extract all loot entries from all data
  const allLootEntries = useMemo(() => {
    const entries: LootEntry[] = [];

    allData.forEach(row => {
      const drops = parseDrops(row.drops || '');
      if (drops.length === 0) return;

      drops.forEach(drop => {
        const trimmedDrop = drop.trim();

        // Skip empty drops
        if (!trimmedDrop || trimmedDrop.length === 0) {
          return;
        }

        // Filter out pure numbers (with or without commas) - these are likely exp values, not actual drops
        // A valid drop should have text after the number (e.g., "5 Gold", not just "5" or "5,000")
        if (/^[\d,]+$/.test(trimmedDrop)) {
          return; // Skip pure numbers (with or without commas)
        }

        const { amount, name } = parseDropAmount(drop);
        const trimmedName = name?.trim() || '';

        // Basic validation: skip if name is clearly invalid
        // A valid item name should:
        // - Not be empty
        // - Have at least 1 character (relaxed from 2)
        // - Not be experience-related
        if (
          !trimmedName || // Empty name
          trimmedName.toLowerCase().includes('experience') || // Experience-related
          trimmedName.toLowerCase().includes('exp ') || // Exp abbreviation
          /^\d+\s*exp$/i.test(trimmedName) // Pattern like "61 exp"
        ) {
          return; // Skip invalid drop names
        }

        const itemValue = parseFloat(itemValues[name] || '0') || 0;
        const imageUrl = `https://www.syrnia.com/images/inventory/${name.replace(/\s/g, '%20')}.png`;

        entries.push({
          timestamp: row.timestamp,
          name,
          quantity: amount,
          valuePerItem: itemValue,
          totalValue: amount * itemValue,
          location: row.location?.trim() || 'Unknown',
          monster: row.monster?.trim() || 'Unknown',
          imageUrl,
        });
      });
    });

    return entries;
  }, [allData, parseDrops, parseDropAmount, itemValues]);

  // Get unique monsters and locations for filters
  const uniqueMonsters = useMemo(() => {
    const monsters = new Set<string>();
    allLootEntries.forEach(entry => {
      if (entry.monster && entry.monster !== 'Unknown') {
        monsters.add(entry.monster);
      }
    });
    return Array.from(monsters).sort();
  }, [allLootEntries]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    allLootEntries.forEach(entry => {
      if (entry.location && entry.location !== 'Unknown') {
        locations.add(entry.location);
      }
    });
    return Array.from(locations).sort();
  }, [allLootEntries]);

  // Filter and search loot entries
  const filteredLootEntries = useMemo(() => {
    let filtered = [...allLootEntries];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        entry =>
          entry.name.toLowerCase().includes(query) ||
          entry.location.toLowerCase().includes(query) ||
          entry.monster.toLowerCase().includes(query),
      );
    }

    // Apply monster filter
    if (filterMonster !== 'none') {
      filtered = filtered.filter(entry => entry.monster === filterMonster);
    }

    // Apply location filter
    if (filterLocation !== 'none') {
      filtered = filtered.filter(entry => entry.location === filterLocation);
    }

    return filtered;
  }, [allLootEntries, searchQuery, filterMonster, filterLocation]);

  // Sort and group loot entries
  const sortedAndGroupedLoot = useMemo(() => {
    const entries = [...filteredLootEntries];

    // Helper function to sort entries by sort option
    const sortEntries = (entriesToSort: LootEntry[]): LootEntry[] => {
      const sorted = [...entriesToSort];
      switch (sortOption) {
        case 'alphabetical':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'totalValue':
          sorted.sort((a, b) => {
            if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue; // Highest value first
            return a.name.localeCompare(b.name); // Then alphabetical
          });
          break;
      }
      return sorted;
    };

    // Group by time filter
    if (timeFilter === 'day') {
      const grouped = new Map<string, LootEntry[]>();
      // Group entries by day
      entries.forEach(entry => {
        const dayStart = getDayStart(entry.timestamp);
        if (!grouped.has(dayStart)) {
          grouped.set(dayStart, []);
        }
        grouped.get(dayStart)!.push(entry);
      });
      // Sort groups by day (newest first), then sort entries within each group by sortOption
      return Array.from(grouped.entries())
        .sort(([a], [b]) => b.localeCompare(a)) // Sort groups by timestamp (newest first)
        .map(([dayStart, groupEntries]) => ({
          header: formatDayHeader(dayStart),
          entries: sortEntries(groupEntries),
        }));
    } else if (timeFilter === 'week') {
      const grouped = new Map<string, LootEntry[]>();
      // Group entries by week
      entries.forEach(entry => {
        const weekStart = getWeekStart(entry.timestamp);
        if (!grouped.has(weekStart)) {
          grouped.set(weekStart, []);
        }
        grouped.get(weekStart)!.push(entry);
      });
      // Sort groups by week (newest first), then sort entries within each group by sortOption
      return Array.from(grouped.entries())
        .sort(([a], [b]) => b.localeCompare(a)) // Sort groups by timestamp (newest first)
        .map(([weekStart, groupEntries]) => ({
          header: formatWeekHeader(weekStart),
          entries: sortEntries(groupEntries),
        }));
    } else if (timeFilter === 'hour') {
      const grouped = new Map<string, LootEntry[]>();
      // Group entries by hour
      entries.forEach(entry => {
        const hourStart = getHourStart(entry.timestamp);
        if (!grouped.has(hourStart)) {
          grouped.set(hourStart, []);
        }
        grouped.get(hourStart)!.push(entry);
      });
      // Sort groups by hour (newest first), then sort entries within each group by sortOption
      return Array.from(grouped.entries())
        .sort(([a], [b]) => b.localeCompare(a)) // Sort groups by timestamp (newest first)
        .map(([hourStart, groupEntries]) => ({
          header: formatHourHeader(hourStart),
          entries: sortEntries(groupEntries),
        }));
    } else {
      // No time filter - no grouping, just sort all entries
      return [{ header: '', entries: sortEntries(entries) }];
    }
  }, [filteredLootEntries, sortOption, timeFilter]);

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
      alert('Error saving item values');
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
    searchQuery,
    setSearchQuery,
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
