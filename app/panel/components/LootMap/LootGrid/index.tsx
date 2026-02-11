import { ItemImage } from "@app/components";
import { memo, useMemo } from "react";
import type { LootEntry, SortOption, LootGroup, TimeFilterOption } from "../useLootMap";

interface AggregatedItem {
  name: string;
  imageUrl: string;
  totalQuantity: number;
  totalValue: number;
  mostRecentTimestamp: number;
}

interface LootGridProps {
  filteredLootEntries: LootEntry[];
  sortedAndGroupedLoot: LootGroup[];
  sortOption: SortOption;
  timeFilter: TimeFilterOption;
  zoomLevel: number;
}

/**
 * Aggregate entries by item name
 */
const aggregateItems = (entries: LootEntry[]): AggregatedItem[] => {
  const itemMap = new Map<string, AggregatedItem>();

  entries.forEach(entry => {
    const existing = itemMap.get(entry.name);
    const timestamp = new Date(entry.timestamp).getTime();
    if (existing) {
      existing.totalQuantity += entry.quantity;
      existing.totalValue += entry.totalValue;
      existing.mostRecentTimestamp = Math.max(existing.mostRecentTimestamp, timestamp);
    } else {
      itemMap.set(entry.name, {
        name: entry.name,
        imageUrl: entry.imageUrl,
        totalQuantity: entry.quantity,
        totalValue: entry.totalValue,
        mostRecentTimestamp: timestamp,
      });
    }
  });

  return Array.from(itemMap.values());
};

/**
 * Sort aggregated items based on sort option
 */
const sortAggregatedItems = (items: AggregatedItem[], sortOption: SortOption): AggregatedItem[] => {
  const sorted = [...items];

  switch (sortOption) {
    case "alphabetical":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "totalValue":
      sorted.sort((a, b) => {
        if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
        return a.name.localeCompare(b.name);
      });
      break;
  }

  return sorted;
};

// Map zoomLevel 1-20 to column count: more zoom = fewer columns = bigger cards
// zoomLevel 1 → 12 cols, zoomLevel 8 → 8 cols, zoomLevel 20 → 2 cols
const getColumnCount = (zoomLevel: number) => Math.max(2, Math.round(13 - zoomLevel * 0.55));

/**
 * Loot Grid Component
 * Displays items in a grid with item image, total quantity, and total GP value
 */
const LootGrid = memo(
  ({ filteredLootEntries, sortedAndGroupedLoot, sortOption, timeFilter, zoomLevel }: LootGridProps) => {
    const isTimeBasedFilter = timeFilter !== "none";

    const groupedData = useMemo(() => {
      if (!isTimeBasedFilter) {
        const aggregated = aggregateItems(filteredLootEntries);
        return [{ header: "", items: sortAggregatedItems(aggregated, sortOption) }];
      }

      return sortedAndGroupedLoot.map(group => ({
        header: group.header,
        items: sortAggregatedItems(aggregateItems(group.entries), sortOption),
      }));
    }, [filteredLootEntries, sortedAndGroupedLoot, sortOption, isTimeBasedFilter]);

    const cols = getColumnCount(zoomLevel);
    const gridStyle = {
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    };

    if (groupedData.length === 0 || groupedData.every(group => group.items.length === 0)) {
      return null;
    }

    return (
      <div className="flex flex-col gap-6">
        {groupedData.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-col gap-4">
            {group.header && <div className="bg-muted/50 rounded-md px-4 py-2 text-sm font-bold">{group.header}</div>}
            <div className="grid gap-2" style={gridStyle}>
              {group.items.map(item => (
                <LootGridCard key={item.name} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
);

LootGrid.displayName = "LootGrid";

/**
 * Individual item card in the grid
 */
const LootGridCard = memo(({ item }: { item: AggregatedItem }) => (
  <div className="flex min-w-0 flex-col items-center rounded-lg border bg-card p-1 transition-shadow hover:shadow-md">
    <ItemImage src={item.imageUrl} name={item.name} quantity={item.totalQuantity} className="aspect-square w-full" />
    <span className="w-full truncate text-center text-[9px] font-semibold text-green-500">
      {item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GP
    </span>
  </div>
));

LootGridCard.displayName = "LootGridCard";

export default LootGrid;
