# SPEC: Skill Action Tracking

## Problem

The extension detects exp changes for ALL skills (Mining, Fishing, Cooking, etc.) via polling in `sendData.ts`, but the scraper and dashboard are combat-focused:

1. **Action text ignored** - Non-combat output like `"You have 78 Cooked Salmon"` is never captured
2. **`totalFights` always 1** - `sendData.ts:147` sets `data.totalFights = 1` for every exp change, even skilling
3. **No item production tracking** - There's no way to see what items were produced during skilling sessions
4. **No action type distinction** - The system treats all exp gains as combat

## Goal

Track skilling actions with item production output, distinguish combat from skilling rows, and display historical item production in the UI.

---

## Subtasks

### ST-1: Data Model Extension

**Files:** `app/utils/csv-tracker.ts`, `app/types/index.ts`

**Changes to `CSVRow` interface** (csv-tracker.ts:4-25):
- Add `actionType: string` field — values: `"combat"` | `"skilling"` | `""`
- Add `actionOutput: string` field — JSON string of `[{item: string, quantity: number}]`

**Changes to `ScreenData` interface** (types/index.ts:39-67):
- Add `actionType?: "combat" | "skilling"` optional field
- Add `actionOutput?: Array<{item: string, quantity: number}>` optional field

**Functions to update:**
- `screenDataToCSVRows()` (csv-tracker.ts:32-60) — map new ScreenData fields to CSVRow
- `csvRowToString()` (csv-tracker.ts:422-442) — append `actionType` and `actionOutput` fields
- `getCSVHeader()` (csv-tracker.ts:447-448) — append `actionType,actionOutput` to header
- `csvRowToObject()` (csv-tracker.ts:65-406) — add 20-field format case; all older format cases default new fields to `""`

**Backward compatibility:**
- Current format: 18 fields → new format: 20 fields
- Old rows (6, 7, 9, 11, 12, 13, 15, 16, 17, 18 fields) get `actionType: ""`, `actionOutput: ""`
- The unknown-format fallback (csv-tracker.ts:384-405) also defaults to `""`

---

### ST-2: Action Output Parsing

**Files:** `app/content/scrapeScreenData.ts`, `app/content/sendData.ts`

#### New function: `parseActionOutput()`

Add to `scrapeScreenData.ts`. Extracts produced items from `#centerContent` / `#LocationContent` DOM.

**Phase 1 skills** (common `"You have X [item]"` pattern):
- Mining — `"You have 14 Tin ore"`
- Fishing — `"You have 78 Cooked Salmon"`
- Woodcutting — `"You have 54 Willow logs"`
- Cooking — `"You have 78 Cooked Salmon"`

**Speed/Travel** (no item output, exp-only):
- Pattern: `"Moving to [destination] takes you [X] Seconds. You will gain [X] Experience in speed."`
- Followed by: `"Speed level: 71 (3223275 exp, 49242 for next level)."`
- Text appears in `#centerContent` (not `#LocationContent`)
- No `actionOutput` items — detected as `actionType: "skilling"` via skill name fallback

**Primary regex:**
```
/You have (\d+) (.+)/i
```

**Bonus items (Fishing):**
- Pattern: `"You also caught 1 leather boots"` — yellow `<font>` text, same DOM location as combat drops
- These already get picked up by `parseDrops()` since they're in yellow font; `parseActionOutput()` should also capture them

**Rare finds (any skill):**
- Pattern: `"You found 1 squirrel!"` / `"You found 1 scroll of education!"` — red `<font>` text
- Regex: `/You found (\d+) (.+?)!/i`

**Returns:** `Array<{item: string, quantity: number}>` or empty array

**Deferred skills** (different text patterns, to be added in a future phase):
- Smithing, Smelting, Construction, Trading, Farming

#### Action type detection

Add to `scrapeScreenData.ts`, within `scrapeScreenData()`:

```
actionType determination logic:
1. If monster detected (parseMonster returns non-empty) → "combat"
2. If #fightLogTop contains combat exp (parseCombatExp returns entries) → "combat"
3. If parseActionOutput() returns items → "skilling"
4. If skill is non-combat (not Attack/Defence/Strength/Health) → "skilling"
5. Otherwise → "" (unknown)
```

Additionally, `scrapeScreenData()` now falls back to `#centerContent` when `#LocationContent` doesn't yield a skill name. This enables speed/travel text detection where the "Speed level: X (Y exp, Z for next level)" pattern appears in `#centerContent`.

Set `actionType` and `actionOutput` on the returned `ScreenData` object.

#### Fix `sendData.ts`

Currently at line 147:
```ts
data.totalFights = 1;  // Always set, even for skilling
```

Change to:
```ts
if (data.actionType === "combat") {
  data.totalFights = 1;
}
```

This fixes the fight count inflation for skilling actions.

---

### ST-3: Background Filter Update

**File:** `app/background/index.ts`

**Current save filter** (background/index.ts:267-286):
```ts
const rowsToSave = uniqueRows.filter(row => {
  // ...
  return hasExp || hasDrops || hasDamage || hasEquipment || hasLocationAndMonster || hasTotalFights;
});
```

**Add condition:**
```ts
const hasActionOutput = row.actionOutput && row.actionOutput.trim() !== "" && row.actionOutput !== "[]";
```

Add `hasActionOutput` to the return expression:
```ts
return hasExp || hasDrops || hasDamage || hasEquipment || hasLocationAndMonster || hasTotalFights || hasActionOutput;
```

This is a safety net — skilling rows with exp gains already pass via `hasExp`, but rows where exp calculation yielded 0 (e.g., baseline-setting scrape) would still be saved if they captured action output.

---

### ST-4: Stats Hooks

**Files:** `app/hooks/stats/useHourStats.ts`, `app/hooks/stats/usePeriodStats.ts`

#### Extend `HourStats` (useHourStats.ts:8-19)

Add fields:
```ts
totalSkillingActions: number;
itemsProduced: Record<string, { quantity: number; skill: string }>;
```

**Processing logic** (inside the `useMemo` in useHourStats):
- For each row, if `row.actionOutput` is non-empty, parse JSON
- Aggregate quantities per item name across all rows in the hour
- Track skill from `row.skill` for each item
- Increment `totalSkillingActions` for rows where `actionType === "skilling"` and the row has meaningful data

#### Extend `PeriodStats` (usePeriodStats.ts:8-21)

Add same fields:
```ts
totalSkillingActions: number;
itemsProduced: Record<string, { quantity: number; skill: string }>;
```

Same aggregation logic, scoped to each period bucket.

#### Export from barrel

Ensure new types are accessible via `app/hooks/stats/index.ts` re-exports (already re-exports everything from these files).

---

### ST-5: Dashboard UI

**Files:** `app/panel/components/Dashboard/HourCard.tsx`, `app/panel/components/Dashboard/useDashboard.ts`

#### Extend `HourCardData` (useDashboard.ts:14-24)

Add fields:
```ts
totalSkillingActions: number;
producedItems: Array<{ name: string; imageUrl: string; quantity: number }>;
```

Populate from `HourStats.totalSkillingActions` and `HourStats.itemsProduced`.

#### Update `HourCard` (HourCard.tsx)

**Conditional action label** (currently line 97):
```tsx
{data.totalFights > 0 && <span>Fights: {data.totalFights.toLocaleString()}</span>}
```

Change to:
```tsx
{data.totalFights > 0 && <span>Fights: {data.totalFights.toLocaleString()}</span>}
{data.totalSkillingActions > 0 && <span>Actions: {data.totalSkillingActions.toLocaleString()}</span>}
```

When both are present (mixed session), both labels show.

**New "Items Produced" section** — same layout as "Drops" section (lines 69-84):
```tsx
{data.producedItems.length > 0 && (
  <div>
    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Items Produced</p>
    <div className="flex flex-wrap gap-2">
      {data.producedItems.map(item => (
        <ItemImage
          key={item.name}
          src={item.imageUrl}
          name={item.name}
          quantity={item.quantity}
          className="h-10 w-10 rounded bg-muted"
        />
      ))}
    </div>
  </div>
)}
```

---

### ST-6: Historical + DataView

**Files:** `app/panel/components/TrackedHistory/index.tsx`, `app/panel/components/DataView/index.tsx`, `app/panel/components/DataView/useDataView.ts`

#### TrackedHistory

Add "Items Produced" to each period breakdown section — display item names and quantities alongside existing "Drops" display.

Source data: `PeriodStats.itemsProduced` (from ST-4).

#### DataView — Filter

Extend `FilterType` (useDataView.ts:4):
```ts
export type FilterType = "all" | "loot" | "exp" | "skilling";
```

Add filter case:
```ts
if (filterType === "skilling") {
  return allRows.filter(row => row.actionType === "skilling");
}
```

#### DataView — Column

Add "Action Output" column to the `TableView` component in `DataView/index.tsx`.

Display parsed `actionOutput` as formatted text (e.g., "78 Cooked Salmon, 1 Squirrel").

---

## Implementation Order

```
ST-1 (Data Model) → ST-2 (Scraping) + ST-3 (Background) → ST-4 (Stats) → ST-5 (Dashboard) + ST-6 (History)
              │                  │                                │                    │
              │                  └── Can be parallel ─────────────┘                    │
              │                                                                        │
              └── Foundation: must be first                          Can be parallel ───┘
```

Dependencies:
- **ST-1** blocks everything (all other subtasks depend on the new fields)
- **ST-2** and **ST-3** can be done in parallel after ST-1
- **ST-4** depends on ST-2 (needs `actionOutput` data flowing in)
- **ST-5** and **ST-6** can be done in parallel after ST-4

---

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Old CSV rows (18 fields) loaded | `actionType=""`, `actionOutput=""` — treated as unknown |
| Old rows with `totalFights=1` but no monster/damage | Heuristic: if `monster===""` and `damageDealt===""`, likely skilling. UI can infer display but stored value stays `""` |
| New rows saved to storage | 20-field CSV format with `actionType` and `actionOutput` appended |
| `csvRowToObject()` format detection | Add `row.length === 20` case before existing `row.length === 18` case |
| Mixed old/new data in same session | Old rows show as before; new rows get enhanced display |

---

## Acceptance Criteria

1. **Mining/Fishing/Woodcutting/Cooking** actions produce `actionOutput` with correct item names and quantities
2. **`totalFights`** is only set to 1 for combat actions, not skilling
3. **Old data** loads without errors — no migration needed, just defaults
4. **Dashboard HourCard** shows "Actions: N" for skilling hours and "Fights: N" for combat hours
5. **Dashboard HourCard** shows "Items Produced" section with item images when skilling
6. **TrackedHistory** shows items produced per period
7. **DataView** has "Skilling" filter option and "Action Output" column
8. **CSV export** includes the two new columns
9. **No regressions** — existing combat tracking, drops, equipment, and damage parsing unchanged

---

## Out of Scope

- Smithing / Smelting / Construction / Trading / Farming parsing (Phase 2)
- Skilling-specific performance metrics (items/hour rates)
- Action output for combat (already tracked via drops)
- Retroactive classification of old rows (would require re-scraping)
