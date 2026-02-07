import { formatHumanDate } from '../helpers/lootHelpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@extension/ui';
import React, { memo, useState, useMemo } from 'react';
import type { LootEntry, LootGroup } from '../useLootMap';

/**
 * Loot table row component
 */
const LootTableRow = memo(({ entry, index, zoomLevel }: { entry: LootEntry; index: number; zoomLevel: number }) => {
  const [imageError, setImageError] = useState(false);

  // Calculate sizes based on zoom level (1-20)
  // zoomLevel 1 = smallest (compact for small screens), zoomLevel 20 = largest
  // More dramatic scaling for better small-width viewing
  const imageSize = useMemo(
    () => 4 + Math.round((zoomLevel / 20) * 12), // 4px to 16px
    [zoomLevel],
  );

  const fontSize = useMemo(
    () => 8 + Math.round((zoomLevel / 20) * 8), // 8px to 16px
    [zoomLevel],
  );

  const cellPadding = useMemo(
    () => 4 + Math.round((zoomLevel / 20) * 8), // 4px to 12px
    [zoomLevel],
  );

  return (
    <TableRow key={`${entry.timestamp}-${entry.name}-${index}`}>
      <TableCell style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>
        {formatHumanDate(entry.timestamp)}
      </TableCell>
      <TableCell style={{ padding: `${cellPadding}px` }}>
        {!imageError ? (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className="object-contain"
            style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="bg-muted flex items-center justify-center rounded"
            style={{ width: `${imageSize}px`, height: `${imageSize}px` }}>
            <span className="truncate font-medium" style={{ fontSize: `${Math.max(6, fontSize - 2)}px` }}>
              {entry.name}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>{entry.name}</TableCell>
      <TableCell className="text-right" style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>
        {entry.valuePerItem.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}{' '}
        GP
      </TableCell>
      <TableCell className="text-right" style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>
        {entry.quantity}x
      </TableCell>
      <TableCell
        className="text-right font-semibold text-green-500"
        style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>
        +
        {entry.totalValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}{' '}
        GP
      </TableCell>
      <TableCell style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>{entry.location}</TableCell>
      <TableCell style={{ fontSize: `${fontSize}px`, padding: `${cellPadding}px` }}>{entry.monster}</TableCell>
    </TableRow>
  );
});

LootTableRow.displayName = 'LootTableRow';

interface LootTableProps {
  sortedAndGroupedLoot: LootGroup[];
  filteredLootEntries: LootEntry[];
  zoomLevel: number;
}

/**
 * Loot Table Component
 * Pure JSX component - displays the loot table with grouping headers
 */
const LootTable = memo(({ sortedAndGroupedLoot, zoomLevel }: LootTableProps) => {
  // Calculate sizes based on zoom level (1-20)
  // More dramatic scaling for better small-width viewing
  const headerFontSize = useMemo(
    () => 9 + Math.round((zoomLevel / 20) * 9), // 9px to 18px
    [zoomLevel],
  );

  const headerPadding = useMemo(
    () => 4 + Math.round((zoomLevel / 20) * 8), // 4px to 12px
    [zoomLevel],
  );

  const groupHeaderPadding = useMemo(
    () => 6 + Math.round((zoomLevel / 20) * 6), // 6px to 12px
    [zoomLevel],
  );

  if (sortedAndGroupedLoot.length === 0 || sortedAndGroupedLoot.every(group => group.entries.length === 0)) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>Timestamp</TableHead>
            <TableHead style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>Image</TableHead>
            <TableHead style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>Name</TableHead>
            <TableHead
              className="text-right"
              style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>
              Value per Item
            </TableHead>
            <TableHead
              className="text-right"
              style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>
              Quantity
            </TableHead>
            <TableHead
              className="text-right"
              style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>
              Drop Value
            </TableHead>
            <TableHead style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>Location</TableHead>
            <TableHead style={{ fontSize: `${headerFontSize}px`, padding: `${headerPadding}px` }}>Monster</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndGroupedLoot.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {group.header && (
                <TableRow className="bg-muted/50">
                  <TableCell
                    colSpan={8}
                    className="font-bold"
                    style={{ fontSize: `${headerFontSize}px`, padding: `${groupHeaderPadding}px` }}>
                    {group.header}
                  </TableCell>
                </TableRow>
              )}
              {group.entries.map((entry, entryIndex) => (
                <LootTableRow
                  key={`${entry.timestamp}-${entry.name}-${entryIndex}`}
                  entry={entry}
                  index={entryIndex}
                  zoomLevel={zoomLevel}
                />
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

LootTable.displayName = 'LootTable';

export default LootTable;
