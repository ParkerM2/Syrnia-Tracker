# Untracked EXP Resolution System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace passive untracked EXP indicators with an active resolution workflow where users distribute untracked exp across time slots and optionally add loot, creating synthetic tracked data.

**Architecture:** Persistent notification card under navbar triggers an expand-in-place resolution editor. User distributes exp/loot across hour slots. On save, synthetic CSVRows are created in tracked data and UntrackedExpRecords are marked resolved.

**Tech Stack:** React 19, TypeScript, TailwindCSS, Radix UI, TanStack Query, Chrome storage

---

## Overview

### Current Behavior
- Extension detects untracked EXP gaps (e.g., 100k Defence exp from 6:45 PM - 8:30 PM)
- Calendar shows `!` badges and `UntrackedExpCard` on overlapping cells
- User has no way to act on this information

### New Behavior
1. Untracked EXP is detected as before
2. **No indicators in the calendar** for unresolved records
3. A **persistent notification card** appears under the top navbar (visible on all screens)
4. User clicks the card to expand a **resolution editor**
5. The editor shows all unresolved gaps grouped by time period
6. User distributes exp across hour slots (with skill selection and quantity inputs)
7. User optionally adds loot from known items
8. On save: synthetic CSVRows are appended to tracked data, records are marked `resolved`
9. The notification disappears; distributed data appears in calendar/loot views like normal tracked data

---

## Data Model Changes

### 1. Extend `UntrackedExpRecord` (app/types/index.ts)

Add two optional fields:

```typescript
export interface UntrackedExpRecord {
  // ... existing fields ...
  id: string;
  skill: string;
  expGained: number;
  startUTC: string;
  endUTC: string;
  detectedAt: string;
  totalExpBefore: number;
  totalExpAfter: number;
  durationMs: number;

  // NEW
  resolved?: boolean;         // true after user distributes and saves
  resolvedAt?: string;        // ISO timestamp of resolution
}
```

### 2. No New Storage Keys

- Resolved data becomes CSVRows in `tracked_data_csv` (existing storage)
- Untracked records stay in `untracked_exp_records` with `resolved: true`
- Item values stay in `drop_gp_values` (existing storage)

---

## Component Architecture

### Notification Card

**Location:** `app/panel/SidePanel.tsx` — rendered between the `<Header />` and the active screen content.

**Component:** `UntrackedExpBanner` (new file: `app/panel/components/UntrackedExpBanner/index.tsx`)

**Show/hide logic:**
- Visible when there are any `UntrackedExpRecord` with `resolved !== true`
- Hidden when all records are resolved (or none exist)

**Collapsed state (default):**
```
┌─────────────────────────────────────────────────┐
│  ⚠ Untracked EXP detected! Click to resolve.   │
└─────────────────────────────────────────────────┘
```
- Full-width, under navbar, above content
- Uses `bg-destructive/10 border-destructive/30` styling
- Entire row is clickable
- Small text showing count: "3 unresolved periods"

**Expanded state:**
```
┌─────────────────────────────────────────────────┐
│  ⚠ Untracked EXP detected!          [Collapse] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Gap: Feb 13, 6:45 PM - 8:30 PM                │
│  Total: 100,000 Defence + 50,000 Cooking        │
│  Distributed: 45,000 / 150,000                  │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Hour  │ Skill     │ EXP      │ Loot    │    │
│  ├───────┼───────────┼──────────┼─────────┤    │
│  │ 6 PM  │ [Defence▾]│ [30000 ] │ [+Add]  │    │
│  │ 7 PM  │ [Defence▾]│ [50000 ] │ [+Add]  │    │
│  │ 8 PM  │ [Defence▾]│ [20000 ] │ [+Add]  │    │
│  │ 6 PM  │ [Cooking▾]│ [25000 ] │         │    │
│  │ 7 PM  │ [Cooking▾]│ [25000 ] │         │    │
│  └───────┴───────────┴──────────┴─────────┘    │
│                                                 │
│  [+ Add Row]           [Cancel]  [Save]         │
└─────────────────────────────────────────────────┘
```
- Expands downward, pushing/hiding the current screen content
- Smooth CSS transition (`max-height` or `grid-template-rows` animation)
- Shows the resolution table for the first unresolved gap
- If multiple gaps exist, show tabs or a next/prev navigation

### Resolution Table

**Per-gap view:**
- **Header:** Time range, total untracked exp per skill, running "distributed" counter
- **Rows:** One row per (hour, skill) combination
- **Pre-populated:** Hours from the gap's time range, one row per detected skill per hour
- **Each row has:**
  - Hour label (read-only): "6 PM", "7 PM", etc.
  - Skill dropdown: Pre-set to the detected skill, changeable to any known skill
  - EXP input: Number input, part of the balancing system
  - Loot button: Opens a popover to add known items with quantity
  - Delete row button (×): Removes the row

**Pre-population logic:**
For a gap 6:45 PM - 8:30 PM with 100k Defence + 50k Cooking:
- Generate hours: [18, 19, 20] (6 PM, 7 PM, 8 PM)
- For each skill detected, create one row per hour
- Initial exp values: distribute evenly (rounded, remainder to last row)
  - Defence: 33,334 + 33,333 + 33,333
  - Cooking: 16,667 + 16,667 + 16,666

**Balancing rules:**
- Running counter at top: `"Distributed: 45,000 / 100,000 Defence"` per skill
- If user changes a row's exp, the counter updates
- Last row for each skill can auto-fill with the remainder (button: "Fill remainder")
- If total exceeds the untracked amount: show error state (red counter), disable Save
- If total is under: show warning (yellow), still allow Save (user may not know exact distribution)
- User can change a row's skill to redistribute between skills

**Add Row:**
- Adds a new empty row with hour dropdown (any hour 0-23) and skill dropdown
- Allows distributing to hours outside the detected range (user may know better)

---

## Loot Entry (Per-Row)

**Trigger:** "+Add" button on each table row opens a popover.

**Popover content:**
- Searchable dropdown (Radix `Select` or filtered list) of all known items from `allUniqueItems`
- Number input for quantity
- "Add" button appends to this row's loot list
- Shows current loot items for this row as removable pills/badges

**Data shape per row:**
```typescript
interface ResolutionRow {
  hour: number;             // 0-23
  skill: string;            // Skill name
  exp: number;              // EXP amount for this hour+skill
  loot: Array<{
    name: string;           // Item name (from known items)
    quantity: number;        // Amount
  }>;
}
```

---

## Save Flow

### Step 1: Create Synthetic CSVRows

For each `ResolutionRow` with `exp > 0`:

```typescript
const syntheticRow: CSVRow = {
  timestamp: new Date(gapDate.setHours(row.hour, 30, 0, 0)).toISOString(),  // Mid-hour
  uuid: crypto.randomUUID(),
  skill: row.skill,
  skillLevel: "",                    // Unknown
  expForNextLevel: "",               // Unknown
  gainedExp: String(row.exp),
  drops: row.loot.map(l => `${l.quantity} ${l.name}`).join(";"),
  hp: "",
  monster: "",
  location: "",
  damageDealt: "",
  damageReceived: "",
  peopleFighting: "",
  totalFights: "",
  totalInventoryHP: "",
  hpUsed: "",
  equipment: "",
  combatExp: "",
  actionType: "",
  actionOutput: "",
};
```

- Timestamp is set to :30 of each hour (mid-point)
- UUID is generated fresh
- `gainedExp` is the user's entered amount
- `drops` uses the standard semicolon-separated format
- All other fields are empty (unknown during untracked period)

### Step 2: Append to Tracked Data

Call `appendTrackedData(syntheticRows)` from storage-service.ts.

### Step 3: Mark Records as Resolved

For each `UntrackedExpRecord` in this gap:
```typescript
record.resolved = true;
record.resolvedAt = new Date().toISOString();
```

Save via a new `resolveUntrackedExpRecords(ids: string[])` function in storage-service.ts.

### Step 4: Invalidate Caches

- Invalidate `trackedData` query (new rows added)
- Invalidate `untrackedExp` query (records now resolved)
- The notification card will auto-hide (no unresolved records)
- Calendar will show the new data on next render

---

## Calendar Changes

### Remove indicators for unresolved records

In `useCalendarData.ts` and `useUntrackedExp.ts`:
- Filter out `resolved === true` records from the "active" untracked records
- Since unresolved records are no longer shown in the calendar (the notification card handles them), the filtering effectively removes all untracked indicators
- Once resolved, the data appears as normal tracked rows (from the synthetic CSVRows)

In `getUntrackedForRange()`:
```typescript
// Only return unresolved records
const overlapping = getRecordsInRange(start, end)
  .filter(r => !r.resolved);
```

This means:
- **Unresolved:** No indicators in calendar. Notification card visible.
- **Resolved:** No indicators (resolved flag). Synthetic CSVRows show as normal data.

### What to keep

The `UntrackedOverflowRow` in DayView and untracked badges in CalendarCell can remain in the code. They'll just never render because `getUntrackedForRange` filters out resolved records, and unresolved ones won't be merged into cells.

If you later decide to show indicators for unresolved records again (e.g., as a "needs attention" marker), the code is ready.

---

## Hook Architecture

### New: `useUntrackedResolution` (app/hooks/data/useUntrackedResolution.ts)

```typescript
export const useUntrackedResolution = () => {
  const { records } = useUntrackedExp();
  const { itemValues } = useItemValuesQuery();
  const queryClient = useQueryClient();

  // Group unresolved records by overlapping time gaps
  const unresolvedGaps = useMemo(() => {
    const unresolved = records.filter(r => !r.resolved);
    return groupByTimeGap(unresolved);  // Group records with overlapping startUTC/endUTC
  }, [records]);

  // Get all known item names for the loot selector
  const { allData } = useTrackedDataQuery();
  const knownItems = useMemo(() => extractUniqueItemNames(allData), [allData]);

  // Generate initial rows for a gap
  const getInitialRows = useCallback((gap: UntrackedGap): ResolutionRow[] => {
    // Compute hours from gap range
    // Create one row per (hour, skill)
    // Distribute exp evenly
  }, []);

  // Save resolution
  const saveResolution = useCallback(async (
    gapRecordIds: string[],
    rows: ResolutionRow[],
    gapDate: Date,
  ) => {
    // 1. Create synthetic CSVRows
    // 2. Append to tracked data
    // 3. Mark records as resolved
    // 4. Invalidate caches
  }, [queryClient]);

  return {
    unresolvedGaps,
    knownItems,
    hasUnresolved: unresolvedGaps.length > 0,
    getInitialRows,
    saveResolution,
  };
};
```

### Types

```typescript
interface UntrackedGap {
  id: string;                               // Derived from first record's ID
  records: UntrackedExpRecord[];            // All records in this gap
  startUTC: string;                         // Earliest startUTC
  endUTC: string;                           // Latest endUTC
  hours: number[];                          // Array of hours [18, 19, 20]
  totalBySkill: Record<string, number>;     // { Defence: 100000, Cooking: 50000 }
}

interface ResolutionRow {
  id: string;                               // Unique row ID (for React keys)
  hour: number;                             // 0-23
  skill: string;                            // Skill name
  exp: number;                              // EXP amount
  loot: Array<{ name: string; quantity: number }>;
}
```

---

## Storage Changes

### New function: `resolveUntrackedExpRecords` (app/utils/storage-service.ts)

```typescript
const resolveUntrackedExpRecords = async (ids: string[]): Promise<void> => {
  const records = await getUntrackedExpRecords();
  const now = new Date().toISOString();
  const updated = records.map(r =>
    ids.includes(r.id) ? { ...r, resolved: true, resolvedAt: now } : r,
  );
  await setInStorage(STORAGE_KEYS.UNTRACKED_EXP, updated);
};
```

Export and add to the barrel.

---

## File Plan

### New files:
| File | Purpose |
|------|---------|
| `app/panel/components/UntrackedExpBanner/index.tsx` | Notification card + resolution editor UI |
| `app/panel/components/UntrackedExpBanner/ResolutionTable.tsx` | The hour/skill/exp/loot table |
| `app/panel/components/UntrackedExpBanner/LootPopover.tsx` | Per-row loot entry popover |
| `app/hooks/data/useUntrackedResolution.ts` | Resolution logic, gap grouping, save flow |

### Modified files:
| File | Change |
|------|--------|
| `app/types/index.ts` | Add `resolved?`, `resolvedAt?` to UntrackedExpRecord |
| `app/utils/storage-service.ts` | Add `resolveUntrackedExpRecords()` function |
| `app/hooks/data/useUntrackedExp.ts` | Filter resolved records from `getUntrackedForRange` |
| `app/hooks/data/index.ts` | Export new hook |
| `app/panel/SidePanel.tsx` | Render `UntrackedExpBanner` between Header and content |

### Untouched files:
| File | Why |
|------|-----|
| `Calendar/useCalendarData.ts` | Untracked filtering happens upstream in useUntrackedExp |
| `Calendar/views/DayView.tsx` | UntrackedOverflowRow stays; won't render with no unresolved records |
| `Calendar/shared.tsx` | No changes needed |
| `Calendar/CalendarCell.tsx` | Indicator code stays; won't fire with no unresolved records |

---

## UI Details

### Notification Card (Collapsed)

```tsx
<div className="mx-2 mt-2 cursor-pointer rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5"
     onClick={toggle}>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px]
                        font-bold text-destructive-foreground">!</span>
      <span className="text-sm font-medium text-foreground">
        Untracked EXP detected!
      </span>
      <span className="text-xs text-muted-foreground">
        Click to resolve.
      </span>
    </div>
    <span className="text-xs text-muted-foreground">
      {unresolvedGaps.length} period{unresolvedGaps.length > 1 ? "s" : ""}
    </span>
  </div>
</div>
```

### Expand/Collapse Animation

Use CSS `grid-template-rows: 0fr` → `1fr` transition on a wrapper:

```tsx
<div className="grid transition-[grid-template-rows] duration-300 ease-in-out"
     style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}>
  <div className="overflow-hidden">
    {/* Resolution editor content */}
  </div>
</div>
```

When expanded, the current screen content should be hidden. This can be achieved by:
- Conditionally rendering the screen content: `{!bannerExpanded && <ActiveScreen />}`
- Or using CSS to hide it: `className={cn(bannerExpanded && "hidden")}`

The conditional render approach is simpler and avoids layout shift.

### Resolution Table Row

```tsx
<div className="flex items-center gap-2 border-b py-2">
  {/* Hour label */}
  <span className="w-16 text-sm text-muted-foreground">{formatHourLabel(row.hour)}</span>

  {/* Skill dropdown */}
  <Select value={row.skill} onValueChange={val => updateRow(row.id, "skill", val)}>
    <SelectTrigger className="w-32">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SKILLS_ARRAY.map(skill => (
        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* EXP input */}
  <Input
    type="number"
    value={row.exp || ""}
    onChange={e => updateRow(row.id, "exp", parseInt(e.target.value) || 0)}
    className="w-28"
    placeholder="0"
  />

  {/* Loot button */}
  <LootPopover
    knownItems={knownItems}
    loot={row.loot}
    onAdd={(name, qty) => addLootToRow(row.id, name, qty)}
    onRemove={(name) => removeLootFromRow(row.id, name)}
  />

  {/* Delete row */}
  <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)}>
    <Cross2Icon className="h-3 w-3" />
  </Button>
</div>
```

### Running Total Display

```tsx
<div className="flex flex-wrap gap-4 text-sm">
  {Object.entries(gap.totalBySkill).map(([skill, total]) => {
    const distributed = rows
      .filter(r => r.skill === skill)
      .reduce((sum, r) => sum + r.exp, 0);
    const isOver = distributed > total;
    const isExact = distributed === total;

    return (
      <div key={skill} className="flex items-center gap-1.5">
        <span className="font-medium">{skill}:</span>
        <span className={cn(
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
```

---

## Edge Cases

### 1. User closes without saving
- No changes made. Notification persists. State is ephemeral (useState).

### 2. New untracked exp detected while editor is open
- The `unresolvedGaps` array updates reactively. Show a toast or update the gap count.
- Don't interrupt the current editing session.

### 3. Gap spans midnight (e.g., 11 PM - 1 AM)
- Hours array: [23, 0]. The synthetic CSVRows should use the correct date for each hour.
- Hour 23 → gap start date. Hour 0 → next day.

### 4. User distributes less exp than detected
- Allowed with a warning. The remaining exp is "lost" (user's choice).
- The UntrackedExpRecord is still marked resolved.

### 5. User distributes more exp than detected
- Not allowed. Save button disabled. Counter shows red.

### 6. Multiple gaps at once
- Show one gap at a time with next/prev navigation.
- Or a tabbed interface: "Gap 1 of 3 →"

### 7. Very old unresolved records
- The notification card always shows if unresolved records exist.
- User can dismiss individual gaps without resolving (add a "Dismiss" button that marks resolved without creating rows).

---

## Execution Order

### Phase 1: Data Layer
1. Add `resolved?` and `resolvedAt?` to `UntrackedExpRecord` type
2. Add `resolveUntrackedExpRecords()` to storage-service
3. Filter resolved records in `useUntrackedExp.getUntrackedForRange()`
4. Create `useUntrackedResolution` hook with gap grouping + save logic

### Phase 2: Notification Card
5. Create `UntrackedExpBanner` component (collapsed state)
6. Render in `SidePanel.tsx` between Header and content
7. Add expand/collapse with animation
8. Conditionally hide screen content when expanded

### Phase 3: Resolution Editor
9. Create `ResolutionTable` component with hour/skill/exp rows
10. Implement running total + balancing logic
11. Implement add/remove row functionality
12. Wire up Save + Cancel buttons

### Phase 4: Loot Entry
13. Create `LootPopover` component with known-item selector
14. Wire up loot data to resolution rows
15. Include loot in synthetic CSVRow creation

### Phase 5: Polish
16. Handle edge cases (midnight crossing, dismiss, multiple gaps)
17. Format, lint, spot-check
18. Test with real extension

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Where does resolution UI live? | Persistent banner under navbar, expands in-place |
| Storage approach? | Synthetic CSVRows in tracked data + resolved flag on records |
| Balancing? | Running total with remainder, error if over, warning if under |
| Time slots? | Hours from gap range only, user can add rows |
| Multi-skill? | Grouped by time gap, all skills in one table |
| Post-save? | Dismiss immediately, data appears in calendar |
| Item selector? | Known items only (from allUniqueItems) |
| Calendar indicators? | Removed for unresolved records (banner handles them) |
