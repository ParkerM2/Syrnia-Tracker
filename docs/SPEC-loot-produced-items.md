# SPEC: Loot Screen Produced Items + Net Profit Fix

## Problem

The LootMap screen only shows combat drops (`row.drops`) but not items produced from skilling (`row.actionOutput`). Additionally, produced items cannot be assigned GP values, and the net profit calculation uses `hpUsed` (from fight log or inventory HP difference) instead of the more accurate `damageReceived` totals.

1. **No produced items in LootMap** — Skilling output (e.g., "220 Cooked Salmon") stored in `actionOutput` is never shown alongside drops
2. **No GP values for produced items** — The item values dialog only lists drop names, not produced item names
3. **Net profit based on hpUsed** — `hpValue = hpUsed * 2.5` is inaccurate; `damageReceived` totals are the correct cost basis

## Goal

Show produced items in the LootMap with a source filter, include them in the item values dialog, and fix net profit to use `damageReceived` totals.

---

## Subtasks

### ST-1: LootMap — Add Produced Items as LootEntries

**Files:** `app/panel/components/LootMap/useLootMap.ts`

#### Extend `LootEntry` interface

Add field:
```ts
source: "drop" | "produced";
```

#### Parse `actionOutput` into LootEntries

In `allLootEntries` useMemo, after processing `row.drops`, also process `row.actionOutput`:

- Parse JSON: `Array<{ item: string; quantity: number }>`
- Quantities are **running totals** (e.g., 220, 222, 224 across rows), not per-action deltas
- Compute per-action deltas by tracking previous quantity per item name while iterating sorted rows
- For each delta > 0, create a `LootEntry` with `source: "produced"`
- Use same imageUrl pattern: `https://www.syrnia.com/images/inventory/${name}.png`
- Set `monster: ""` and `location: ""` (skilling has no monster/location context)

**Delta calculation approach:**
```
previousQuantities: Map<string, number>
for each row (sorted by timestamp ascending):
  parse actionOutput → items[]
  for each item:
    delta = item.quantity - (previousQuantities.get(item.name) || item.quantity)
    if delta > 0 → push LootEntry with quantity = delta
    previousQuantities.set(item.name, item.quantity)
```

Note: When `previousQuantities` has no entry for an item, the first row serves as the baseline (delta = 0, no entry created). This mirrors the exp baseline behavior.

#### Existing drop entries

Set `source: "drop"` on all existing drop LootEntries.

---

### ST-2: LootMap — Source Filter

**Files:** `app/panel/components/LootMap/useLootMap.ts`, `app/panel/components/LootMap/index.tsx`

#### New state in `useLootMap`

```ts
export type SourceFilterOption = "all" | "drops" | "produced";
const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>("all");
```

#### Apply source filter

In `filteredLootEntries`, add source filter logic:
```ts
if (sourceFilter === "drops") {
  filtered = filtered.filter(entry => entry.source === "drop");
}
if (sourceFilter === "produced") {
  filtered = filtered.filter(entry => entry.source === "produced");
}
```

#### UI — Source filter tabs

Add a second row of tabs or extend the filter popover with a "Source" select:
```tsx
<div className="space-y-1">
  <span className="text-sm font-medium">Source</span>
  <Select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
    <option value="all">All Items</option>
    <option value="drops">Drops Only</option>
    <option value="produced">Produced Only</option>
  </Select>
</div>
```

#### Export

Return `sourceFilter` and `setSourceFilter` from hook.

---

### ST-3: LootMap — Item Values for Produced Items

**Files:** `app/panel/components/LootMap/useLootMap.ts`

#### Include produced items in `allUniqueItems`

The `allUniqueItems` memo already collects names from `allLootEntries`. Since ST-1 adds produced items to `allLootEntries`, they will automatically appear in the item values dialog.

No additional code changes needed — this is a natural consequence of ST-1.

#### Pricing storage

`useItemValuesQuery` stores values in `chrome.storage.local["drop_gp_values"]` as `Record<string, string>`. This key-value store is item-name-agnostic, so produced items work out of the box.

---

### ST-4: Net Profit — Use damageReceived

**Files:** `app/hooks/stats/useHourStats.ts`, `app/hooks/stats/usePeriodStats.ts`

#### useHourStats changes

**Current** (lines 296-367):
```ts
// HP used from fight log
totalHpUsed = sum of row.hpUsed
// Fallback: inventory HP difference
hpUsed = { used: firstHP - lastHP, startHP, endHP }
hpValue = hpUsed.used * 2.5
netProfit = totalDropValue - hpValue
```

**New:**
```ts
// Sum all damageReceived values across all rows
let totalDamageReceived = 0;
uniqueEntries.forEach(row => {
  if (row.damageReceived && row.damageReceived.trim() !== "") {
    row.damageReceived.split(";").forEach(dmg => {
      const val = parseInt(dmg.trim(), 10);
      if (!isNaN(val) && val > 0) {
        totalDamageReceived += val;
      }
    });
  }
});

// hpValue now based on damageReceived
const hpValue = totalDamageReceived * 2.5;
const netProfit = totalDropValue - hpValue;
```

Keep the existing `hpUsed` calculation for display purposes (start/end HP, HP consumed), but decouple it from net profit.

#### usePeriodStats changes

Same change: replace `hpValue = hpUsed.used * 2.5` with `hpValue = totalDamageReceived * 2.5`.

The `hpUsed` object in `PeriodStats` remains for informational display in TrackedHistory.

#### Include produced item values in revenue

Currently `totalDropValue` only sums drop loot values. Produced items (with GP values from the pricing dialog) should also contribute to the revenue side.

Add produced item value calculation:
```ts
// Calculate produced items value
let producedItemsValue = 0;
Object.entries(itemsProduced).forEach(([name, data]) => {
  const valuePerItem = parseFloat(itemValues[name] || "0") || 0;
  producedItemsValue += data.quantity * valuePerItem;
});

const netProfit = (totalDropValue + producedItemsValue) - hpValue;
```

---

### ST-5: LootTable — Source Column

**Files:** `app/panel/components/LootMap/LootTable/index.tsx`

Add a "Source" column to the TanStack table:
```ts
columnHelper.accessor("source", {
  header: "Source",
  cell: info => (info.getValue() === "produced" ? "Produced" : "Drop"),
});
```

This helps users distinguish between drops and produced items in table view.

---

## Implementation Order

```
ST-1 (Add produced items to LootEntries)
  ↓
ST-2 (Source filter) + ST-3 (Item values — automatic) + ST-5 (Table column)
  ↓
ST-4 (Net profit fix)
```

- **ST-1** must be first — all other LootMap changes depend on produced items being in the entries
- **ST-2**, **ST-3**, **ST-5** can be done in parallel after ST-1
- **ST-4** is independent (different files) and can be done in parallel with ST-1/ST-2/ST-3

---

## Acceptance Criteria

1. **LootMap grid/table** shows produced items (e.g., "Cooked Salmon") alongside drops
2. **Source filter** in filter popover toggles between All / Drops Only / Produced Only
3. **Item Values dialog** lists both drop items and produced items
4. **GP values** assigned to produced items are used in profit calculations
5. **Net profit** uses `totalDamageReceived * 2.5` as cost, not `hpUsed * 2.5`
6. **Net profit** revenue side includes both drop values and produced item values
7. **HourCard** and **TrackedHistory** display correct net profit with new formula
8. **LootTable** has a "Source" column distinguishing drops from produced items
9. **No regressions** — existing drop display, combat tracking, equipment parsing unchanged
10. **Produced item deltas** are correctly calculated from running totals (not raw quantities)

---

## Out of Scope

- Produced item images from game (using standard inventory URL pattern)
- Items/hour rate calculations for skilling
- Retroactive produced item tracking for old rows without `actionOutput`
- Per-item profit/loss breakdown
