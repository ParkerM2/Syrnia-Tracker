import { LootPopover } from "./LootPopover";
import { Button, Input, Select, cn } from "@app/components";
import { SKILLS_ARRAY } from "@app/constants";
import { formatExp } from "@app/utils/formatting";
import { memo, useCallback, useState } from "react";
import type { ResolutionRow, UntrackedGap } from "@app/hooks/data/useUntrackedResolution";

interface ResolutionTableProps {
  gap: UntrackedGap;
  initialRows: ResolutionRow[];
  knownItems: string[];
  onSave: (gapRecordIds: string[], rows: ResolutionRow[], gapDate: Date) => Promise<void>;
  onDismiss: (gapRecordIds: string[]) => Promise<void>;
}

const formatHourLabel = (hour: number): string => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
};

const ResolutionTable = memo(({ gap, initialRows, knownItems, onSave, onDismiss }: ResolutionTableProps) => {
  const [rows, setRows] = useState<ResolutionRow[]>(initialRows);
  const [saving, setSaving] = useState(false);

  // Compute distributed totals per skill
  const distributedBySkill: Record<string, number> = {};
  rows.forEach(r => {
    distributedBySkill[r.skill] = (distributedBySkill[r.skill] || 0) + r.exp;
  });

  // Check if any skill is over-distributed
  const hasOverDistributed = Object.entries(gap.totalBySkill).some(
    ([skill, total]) => (distributedBySkill[skill] || 0) > total,
  );

  const updateRow = useCallback((rowId: string, field: keyof ResolutionRow, value: string | number) => {
    setRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, [field]: field === "exp" ? Number(value) || 0 : value } : r)),
    );
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  }, []);

  const addRow = useCallback(() => {
    const defaultHour = gap.hours[0] ?? 0;
    const defaultSkill = Object.keys(gap.totalBySkill)[0] ?? SKILLS_ARRAY[0];
    setRows(prev => [...prev, { id: crypto.randomUUID(), hour: defaultHour, skill: defaultSkill, exp: 0, loot: [] }]);
  }, [gap]);

  const addLootToRow = useCallback((rowId: string, name: string, quantity: number) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const existing = r.loot.find(l => l.name === name);
        if (existing) {
          return { ...r, loot: r.loot.map(l => (l.name === name ? { ...l, quantity: l.quantity + quantity } : l)) };
        }
        return { ...r, loot: [...r.loot, { name, quantity }] };
      }),
    );
  }, []);

  const removeLootFromRow = useCallback((rowId: string, name: string) => {
    setRows(prev => prev.map(r => (r.id !== rowId ? r : { ...r, loot: r.loot.filter(l => l.name !== name) })));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const gapDate = new Date(gap.startUTC);
      const recordIds = gap.records.map(r => r.id);
      await onSave(recordIds, rows, gapDate);
    } finally {
      setSaving(false);
    }
  }, [gap, rows, onSave]);

  const handleDismiss = useCallback(async () => {
    setSaving(true);
    try {
      const recordIds = gap.records.map(r => r.id);
      await onDismiss(recordIds);
    } finally {
      setSaving(false);
    }
  }, [gap, onDismiss]);

  // Format the time range
  const startDate = new Date(gap.startUTC);
  const endDate = new Date(gap.endUTC);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  const dateOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeRange = `${startDate.toLocaleDateString(undefined, dateOpts)}, ${startDate.toLocaleTimeString(undefined, timeOpts)} - ${endDate.toLocaleTimeString(undefined, timeOpts)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Gap header */}
      <div>
        <p className="text-sm font-semibold text-foreground">{timeRange}</p>
        <div className="mt-1 flex flex-wrap gap-3">
          {Object.entries(gap.totalBySkill).map(([skill, total]) => {
            const distributed = distributedBySkill[skill] || 0;
            const isOver = distributed > total;
            const isExact = distributed === total;
            return (
              <div key={skill} className="flex items-center gap-1.5 text-xs">
                <span className="font-medium">{skill}:</span>
                <span
                  className={cn(
                    "font-semibold",
                    isOver ? "text-destructive" : isExact ? "text-primary" : "text-muted-foreground",
                  )}>
                  {formatExp(distributed)}
                </span>
                <span className="text-muted-foreground">/ {formatExp(total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-1">
        {rows.map(row => (
          <div key={row.id} className="border-border/30 flex flex-wrap items-center gap-2 border-b py-2">
            {/* Hour label */}
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{formatHourLabel(row.hour)}</span>

            {/* Skill dropdown */}
            <Select
              value={row.skill}
              onChange={e => updateRow(row.id, "skill", e.target.value)}
              className="h-8 w-28 text-xs">
              {SKILLS_ARRAY.map(skill => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </Select>

            {/* EXP input */}
            <Input
              type="number"
              value={row.exp || ""}
              onChange={e => updateRow(row.id, "exp", e.target.value)}
              className="h-8 w-24 text-xs"
              placeholder="0"
            />

            {/* Loot */}
            <LootPopover
              knownItems={knownItems}
              loot={row.loot}
              onAdd={(name, qty) => addLootToRow(row.id, name, qty)}
              onRemove={name => removeLootFromRow(row.id, name)}
            />

            {/* Delete row */}
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-destructive">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addRow}>
          + Add Row
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={handleDismiss}
            disabled={saving}>
            Dismiss
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving || hasOverDistributed}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
});

ResolutionTable.displayName = "ResolutionTable";

export { ResolutionTable };
