import { useDataView } from "./useDataView";
import {
  cn,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Switch,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@app/components";
import { memo } from "react";
import type { CSVRow } from "@app/types";

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Truncate long text for mobile display
 */
const truncateText = (text: string, maxLength: number = 30): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Parse JSON fields safely
 */
const parseJSONField = (field: string): unknown => {
  if (!field || field.trim() === "") return null;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
};

/**
 * Transform CSV row to properly parse JSON string fields
 */
const transformRowForDisplay = (row: CSVRow): Record<string, unknown> => ({
  ...row,
  equipment: parseJSONField(row.equipment),
  combatExp: parseJSONField(row.combatExp),
  actionOutput: parseJSONField(row.actionOutput),
  // Parse other semicolon-separated fields into arrays for better display
  drops: row.drops ? row.drops.split(";").filter(d => d.trim()) : [],
  damageDealt: row.damageDealt ? row.damageDealt.split(";").filter(d => d.trim()) : [],
  damageReceived: row.damageReceived ? row.damageReceived.split(";").filter(d => d.trim()) : [],
});

/**
 * Table View Component
 */
const TableView = memo(({ rows }: { rows: CSVRow[] }) => {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data to display</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Timestamp</TableHead>
            <TableHead className="min-w-[100px]">Skill</TableHead>
            <TableHead className="min-w-[80px]">Level</TableHead>
            <TableHead className="min-w-[100px]">Gained Exp</TableHead>
            <TableHead className="min-w-[150px]">Combat Exp</TableHead>
            <TableHead className="min-w-[150px]">Drops</TableHead>
            <TableHead className="min-w-[120px]">Monster</TableHead>
            <TableHead className="min-w-[120px]">Location</TableHead>
            <TableHead className="min-w-[80px]">HP</TableHead>
            <TableHead className="min-w-[80px]">HP Used</TableHead>
            <TableHead className="min-w-[150px]">Equipment Totals</TableHead>
            <TableHead className="min-w-[100px]">Helm</TableHead>
            <TableHead className="min-w-[100px]">Shield</TableHead>
            <TableHead className="min-w-[100px]">Weapon</TableHead>
            <TableHead className="min-w-[100px]">Body</TableHead>
            <TableHead className="min-w-[100px]">Legs</TableHead>
            <TableHead className="min-w-[100px]">Gloves</TableHead>
            <TableHead className="min-w-[100px]">Boots</TableHead>
            <TableHead className="min-w-[100px]">Horse</TableHead>
            <TableHead className="min-w-[100px]">Trophy</TableHead>
            <TableHead className="min-w-[80px]">Type</TableHead>
            <TableHead className="min-w-[150px]">Action Output</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const equipment = parseJSONField(row.equipment) as Record<string, Record<string, unknown>> | null;
            const combatExp = parseJSONField(row.combatExp) as Array<{ skill: string; exp: string }> | null;

            // Format equipment slot display
            const formatEquipmentSlot = (slot: Record<string, unknown> | null | undefined) => {
              if (!slot) return "-";
              return (slot.name as string) || "-";
            };

            // Format equipment totals
            const formatEquipmentTotals = (eq: Record<string, Record<string, unknown>> | null | undefined) => {
              if (!eq || !eq.totals) return "-";
              const totals = eq.totals;
              const parts = [];
              if (totals.aim !== undefined) parts.push(`Aim: ${totals.aim}`);
              if (totals.power !== undefined) parts.push(`Power: ${totals.power}`);
              if (totals.armour !== undefined) parts.push(`Armour: ${totals.armour}`);
              return parts.length > 0 ? parts.join(", ") : "-";
            };

            return (
              <TableRow key={`${row.uuid}-${index}`}>
                <TableCell className="text-xs">{formatTimestamp(row.timestamp)}</TableCell>
                <TableCell className="font-medium">{row.skill || "-"}</TableCell>
                <TableCell>{row.skillLevel || "-"}</TableCell>
                <TableCell className="text-right">
                  {row.gainedExp ? parseInt(row.gainedExp).toLocaleString() : "0"}
                </TableCell>
                <TableCell>
                  {combatExp && Array.isArray(combatExp) && combatExp.length > 0 ? (
                    <span className="text-xs" title={JSON.stringify(combatExp, null, 2)}>
                      {combatExp.map(exp => `${exp.skill}: +${exp.exp}`).join(", ")}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {row.drops ? (
                    <span className="text-xs" title={row.drops}>
                      {truncateText(row.drops.replace(/;/g, ", "), 40)}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{row.monster || "-"}</TableCell>
                <TableCell>{row.location || "-"}</TableCell>
                <TableCell>{row.totalInventoryHP || row.hp || "-"}</TableCell>
                <TableCell className="text-right">{row.hpUsed ? parseInt(row.hpUsed).toLocaleString() : "-"}</TableCell>
                <TableCell className="text-xs">{formatEquipmentTotals(equipment)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.helm)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.shield)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.weapon)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.body)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.legs)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.gloves)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.boots)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.horse)}</TableCell>
                <TableCell className="text-xs">{formatEquipmentSlot(equipment?.trophy)}</TableCell>
                <TableCell className="text-xs">{row.actionType || ""}</TableCell>
                <TableCell className="text-xs">
                  {row.actionOutput && row.actionOutput !== "[]"
                    ? (() => {
                        try {
                          const items: Array<{ item: string; quantity: number }> = JSON.parse(row.actionOutput);
                          return items.map(i => `${i.quantity} ${i.item}`).join(", ");
                        } catch {
                          return "";
                        }
                      })()
                    : ""}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

TableView.displayName = "TableView";

/**
 * Prettify and syntax highlight JSON string
 */
const prettifyJSON = (data: unknown): string =>
  // Use JSON.stringify with proper spacing for prettification
  JSON.stringify(data, null, 2);
/**
 * Syntax highlight JSON string with proper color coding
 */
const syntaxHighlight = (json: string): string => {
  // Escape HTML entities
  json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Apply syntax highlighting
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    match => {
      let cls = "text-orange-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-blue-400 font-semibold"; // key
        } else {
          cls = "text-green-400"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-400"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-red-400"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
};

/**
 * JSON View Component with syntax highlighting and prettification
 */
const JSONView = memo(({ rows }: { rows: CSVRow[] }) => {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No data to display</div>;
  }

  // Transform rows to parse JSON string fields
  const transformedRows = rows.map(transformRowForDisplay);

  // Prettify the JSON data
  const jsonString = prettifyJSON(transformedRows);
  const highlighted = syntaxHighlight(jsonString);

  return (
    <div className="max-h-[600px] w-full overflow-auto">
      <div className="relative rounded-lg border border-border bg-slate-950 dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-slate-900 px-4 py-2 dark:bg-slate-800">
          <span className="font-mono text-xs text-slate-400">JSON Data ({rows.length} records)</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(jsonString);
            }}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
            title="Copy to clipboard">
            Copy
          </button>
        </div>

        {/* JSON Content - Left aligned with proper formatting */}
        <pre className="overflow-x-auto whitespace-pre p-4 text-left font-mono text-xs">
          <code
            className="inline-block text-left leading-relaxed text-slate-300"
            style={{ tabSize: 2, MozTabSize: 2 }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
});

JSONView.displayName = "JSONView";

/**
 * DataView Component
 * Displays all tracked data in a table or JSON format with filters
 */
const DataView = memo(() => {
  const { rows, filterType, setFilterType, viewMode, setViewMode, isLoading, error, totalCount, filteredCount } =
    useDataView();

  if (isLoading) {
    return <div className={cn("p-4 text-lg font-semibold")}>Loading data...</div>;
  }

  if (error) {
    return (
      <div className={cn("p-4 text-lg font-semibold text-destructive")}>
        Error loading data: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4")}>
      {/* Header Card with Filters and View Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Data View</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>
              Total Records: <strong>{totalCount}</strong>
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span>
              Filtered: <strong>{filteredCount}</strong>
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2">
            <Label className="text-base font-medium">Filter</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                as="button"
                type="button"
                onClick={() => setFilterType("all")}
                isActive={filterType === "all"}
                className="cursor-pointer">
                All Data
              </Badge>
              <Badge
                as="button"
                type="button"
                onClick={() => setFilterType("loot")}
                isActive={filterType === "loot"}
                className="cursor-pointer">
                Loot Only
              </Badge>
              <Badge
                as="button"
                type="button"
                onClick={() => setFilterType("exp")}
                isActive={filterType === "exp"}
                className="cursor-pointer">
                Exp Gains Only
              </Badge>
              <Badge
                as="button"
                type="button"
                onClick={() => setFilterType("skilling")}
                isActive={filterType === "skilling"}
                className="cursor-pointer">
                Skilling
              </Badge>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-card/50 flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="view-mode" className="cursor-pointer text-base font-medium">
                View Mode
              </Label>
              <p className="text-sm text-muted-foreground">{viewMode === "table" ? "Table View" : "JSON View"}</p>
            </div>
            <Switch
              id="view-mode"
              checked={viewMode === "json"}
              onCheckedChange={checked => setViewMode(checked ? "json" : "table")}
              className="shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Display Card */}
      <Card>
        <CardContent className="p-4">
          {viewMode === "table" ? <TableView rows={rows} /> : <JSONView rows={rows} />}
        </CardContent>
      </Card>
    </div>
  );
});

DataView.displayName = "DataView";

export default DataView;
