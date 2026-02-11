import { formatTimestamp } from "../helpers/lootHelpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ItemImage } from "@app/components";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useState } from "react";
import type { LootEntry, TimeFilterOption } from "../useLootMap";
import type { SortingState } from "@tanstack/react-table";

const columnHelper = createColumnHelper<LootEntry>();

const buildColumns = (timeFilter: TimeFilterOption) => [
  columnHelper.accessor("timestamp", {
    header: "Time",
    cell: info => formatTimestamp(info.getValue(), timeFilter),
    sortingFn: "datetime",
  }),
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

interface LootTableProps {
  filteredLootEntries: LootEntry[];
  timeFilter: TimeFilterOption;
  zoomLevel: number;
}

const LootTable = memo(({ filteredLootEntries, timeFilter }: LootTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);

  const columns = buildColumns(timeFilter);

  const table = useReactTable({
    data: filteredLootEntries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (filteredLootEntries.length === 0) return null;

  return (
    <div className="overflow-x-auto">
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
    </div>
  );
});

LootTable.displayName = "LootTable";

export default LootTable;
