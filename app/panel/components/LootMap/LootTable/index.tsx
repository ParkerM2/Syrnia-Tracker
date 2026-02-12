import { formatTimestamp } from "../helpers/lootHelpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ItemImage, Badge, cn } from "@app/components";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useMemo, useState } from "react";
import type { LootEntry, LootGroup, TimeFilterOption } from "../useLootMap";
import type { SortingState } from "@tanstack/react-table";

const columnHelper = createColumnHelper<LootEntry>();

const buildColumns = (timeFilter: TimeFilterOption, combined: boolean) => [
  ...(combined
    ? []
    : [
        columnHelper.accessor("timestamp", {
          header: "Time",
          cell: info => formatTimestamp(info.getValue(), timeFilter),
          sortingFn: "datetime" as const,
        }),
      ]),
  columnHelper.display({
    id: "image",
    header: "Item",
    enableSorting: false,
    cell: ({ row }) => (
      <ItemImage
        src={row.original.imageUrl}
        name={row.original.name}
        quantity={row.original.quantity}
        className="h-8 w-8"
      />
    ),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: info => (
      <span className="block max-w-[120px] truncate" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  ...(combined
    ? [
        columnHelper.accessor("quantity", {
          header: "Qty",
          cell: info => info.getValue().toLocaleString(),
          meta: { align: "right" },
        }),
      ]
    : []),
  columnHelper.accessor("totalValue", {
    header: "Value",
    cell: info =>
      `${info.getValue().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GP`,
    meta: { align: "right" },
  }),
  columnHelper.accessor("source", {
    header: "Source",
    cell: info => (info.getValue() === "produced" ? "Produced" : "Drop"),
  }),
];

/**
 * Aggregate entries by item name — sums quantity and totalValue, keeps most recent timestamp
 */
const combineEntries = (entries: LootEntry[]): LootEntry[] => {
  const map = new Map<string, LootEntry>();

  entries.forEach(entry => {
    const existing = map.get(entry.name);
    if (existing) {
      existing.quantity += entry.quantity;
      existing.totalValue += entry.totalValue;
      if (entry.timestamp > existing.timestamp) {
        existing.timestamp = entry.timestamp;
      }
    } else {
      map.set(entry.name, { ...entry });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name));
};

interface LootTableProps {
  filteredLootEntries: LootEntry[];
  sortedAndGroupedLoot: LootGroup[];
  timeFilter: TimeFilterOption;
  zoomLevel: number;
}

const GroupTable = memo(
  ({
    entries,
    timeFilter,
    combined,
    sorting,
    onSortingChange,
  }: {
    entries: LootEntry[];
    timeFilter: TimeFilterOption;
    combined: boolean;
    sorting: SortingState;
    onSortingChange: (s: SortingState) => void;
  }) => {
    const columns = useMemo(() => buildColumns(timeFilter, combined), [timeFilter, combined]);

    const table = useReactTable({
      data: entries,
      columns,
      state: { sorting },
      onSortingChange,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    return (
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align;
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    className={`${align === "right" ? "text-right" : ""} ${canSort ? "cursor-pointer select-none" : ""}`}
                    onClick={header.column.getToggleSortingHandler()}>
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" && <span aria-hidden="true">&uarr;</span>}
                      {sorted === "desc" && <span aria-hidden="true">&darr;</span>}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => {
                const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                return (
                  <TableCell key={cell.id} className={`py-1 ${align === "right" ? "text-right" : ""}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
);

GroupTable.displayName = "GroupTable";

const LootTable = memo(({ filteredLootEntries, sortedAndGroupedLoot, timeFilter }: LootTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);
  const [combineItems, setCombineItems] = useState(false);
  const isGrouped = timeFilter !== "none";

  if (filteredLootEntries.length === 0) return null;

  if (!isGrouped) {
    return (
      <div className="overflow-x-auto">
        <GroupTable
          entries={filteredLootEntries}
          timeFilter={timeFilter}
          combined={false}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sortedAndGroupedLoot.map(group => {
        if (group.entries.length === 0) return null;

        const totalValue = group.entries.reduce((sum, e) => sum + e.totalValue, 0);
        const netProfit = totalValue - group.totalCost;

        return (
          <div key={group.header} className="flex flex-col gap-2">
            <div className="bg-muted/50 flex items-center justify-between rounded-md px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{group.header}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    netProfit >= 0 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600",
                  )}>
                  {netProfit >= 0 ? "+" : ""}
                  {netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GP
                </span>
              </div>
              <Badge
                as="button"
                type="button"
                onClick={() => setCombineItems(prev => !prev)}
                isActive={combineItems}
                className="cursor-pointer text-xs">
                Combine
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <GroupTable
                entries={combineItems ? combineEntries(group.entries) : group.entries}
                timeFilter={timeFilter}
                combined={combineItems}
                sorting={combineItems ? [{ id: "totalValue", desc: true }] : sorting}
                onSortingChange={setSorting}
              />
            </div>
            <div className="flex items-center justify-end gap-4 px-4 py-1 text-xs text-muted-foreground">
              <span>
                Total Value:{" "}
                {totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GP
              </span>
              <span>
                Total Cost:{" "}
                {group.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

LootTable.displayName = "LootTable";

export default LootTable;
