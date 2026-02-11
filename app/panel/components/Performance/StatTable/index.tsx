import { useStatTable } from "./useStatTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from "@app/components";
import { memo } from "react";
import type { StatRow } from "./types";

interface StatTableProps {
  rows: StatRow[];
  className?: string;
}

/**
 * Reusable stat table component with composition pattern
 * Transposed: stats as columns, values as rows
 */
const StatTable = memo(({ rows, className }: StatTableProps) => {
  const { visibleRows, formatRowValue } = useStatTable(rows);

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {visibleRows.map((row, index) => (
              <TableHead key={`header-${row.label}-${index}`} className="text-right">
                {row.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {visibleRows.map((row, index) => {
              const displayValue = formatRowValue(row);
              const cellClassName = cn("text-right font-medium", row.className);

              return (
                <TableCell key={`value-${row.label}-${index}`} className={cellClassName}>
                  {displayValue}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
});

StatTable.displayName = "StatTable";

export { StatTable };
export type { StatRow } from "./types";
