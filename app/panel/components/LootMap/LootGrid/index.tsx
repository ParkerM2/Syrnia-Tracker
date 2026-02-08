import { Badge } from '@app/components';
import { memo, useState, useMemo } from 'react';
import type { LootEntry, SortOption, LootGroup, TimeFilterOption } from '../useLootMap';

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

/**
 * Loot Grid Component
 * Displays items in a flex grid with item image, total quantity, and total GP value
 */
const LootGrid = memo(
  ({ filteredLootEntries, sortedAndGroupedLoot, sortOption, timeFilter, zoomLevel }: LootGridProps) => {
    // Check if we need to show headers (time-based filter)
    const isTimeBasedFilter = timeFilter === 'day' || timeFilter === 'week' || timeFilter === 'hour';

    // Process grouped data for time-based filters
    const groupedData = useMemo(() => {
      if (!isTimeBasedFilter) {
        // For non-time-based filters, aggregate all items
        const aggregated = aggregateItems(filteredLootEntries);
        return [{ header: '', items: sortAggregatedItems(aggregated, sortOption) }];
      }

      // For time-based filters, group by time period and aggregate within each group
      return sortedAndGroupedLoot.map(group => ({
        header: group.header,
        items: sortAggregatedItems(aggregateItems(group.entries), sortOption),
      }));
    }, [filteredLootEntries, sortedAndGroupedLoot, sortOption, isTimeBasedFilter]);

    if (groupedData.length === 0 || groupedData.every(group => group.items.length === 0)) {
      return null;
    }

    // Calculate column count based on zoom level
    // zoomLevel 1 = smallest cards (most columns), zoomLevel 20 = largest cards (fewest columns)
    // Formula: max(1, 21 - zoomLevel) gives range from 20 cols (zoom 1) to 1 col (zoom 20)
    // Use inline style for dynamic column count since Tailwind doesn't support dynamic class names
    const gridStyle = {
      gridTemplateColumns: `repeat(${Math.max(1, 21 - zoomLevel)}, minmax(0, 1fr))`,
    };

    return (
      <div className="flex flex-col gap-6">
        {groupedData.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-col gap-4">
            {group.header && <div className="bg-muted/50 rounded-md px-4 py-2 text-sm font-bold">{group.header}</div>}
            <div className="grid gap-4" style={gridStyle}>
              {group.items.map(item => (
                <LootGridCard key={item.name} item={item} zoomLevel={zoomLevel} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
);

LootGrid.displayName = 'LootGrid';

/**
 * Individual item card in the grid
 */
const LootGridCard = memo(({ item, zoomLevel }: { item: AggregatedItem; zoomLevel: number }) => {
  const [imageError, setImageError] = useState(false);

  // Calculate text size based on zoom level (smaller zoom = smaller cards = smaller text)
  // zoomLevel 1-20, map to text sizes from 8px to 14px
  const quantityTextSize = useMemo(
    () =>
      // Inverse relationship: smaller zoom level = smaller text
      // Map zoom 1-20 to text sizes: 8px to 14px
      8 + Math.round((zoomLevel / 20) * 6),
    [zoomLevel],
  );

  return (
    <div className="flex flex-col rounded-lg border bg-card p-2 transition-shadow hover:shadow-md">
      {/* Item Image Container */}
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden">
        {!imageError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-muted">
            <span className="truncate text-xs font-medium">{item.name}</span>
          </div>
        )}

        {/* Total Quantity - Top Left (no background, scales with image) */}
        <div
          className="absolute left-1 top-1 font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          style={{ fontSize: `${quantityTextSize}px` }}>
          {item.totalQuantity.toLocaleString()}
        </div>
      </div>

      {/* Total GP Value Badge - Below Image */}
      <div className="mt-2 flex justify-center">
        <Badge className="border text-[10px] font-semibold text-green-500">
          {item.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{' '}
          GP
        </Badge>
      </div>
    </div>
  );
});

LootGridCard.displayName = 'LootGridCard';

export default LootGrid;
