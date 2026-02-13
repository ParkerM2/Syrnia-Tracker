# Untracked Experience Detection & Session Baseline System

## Problem Statement

The extension currently only tracks exp when it actively observes screen data changes (content script polls every ~2s). Several gaps exist:

1. **New skill trained** - User trains a skill not yet in `lastExpBySkill`. Currently the baseline is set correctly (gainedExp=0), but we have no way to know the skill's total exp history before tracking began.
2. **Exp gained elsewhere** - User gains exp on a different device, or before the extension was installed/active. When tracking resumes, the first scrape resets the baseline (stale gap >5 min), silently losing the delta.
3. **No session concept** - The extension has no snapshot of all skills at session start, so it can't detect gaps across multiple skills simultaneously.
4. **Calendar blind spots** - Days/hours where exp was gained but not tracked show as empty, making the calendar inaccurate for total exp history.

---

## Design Decisions (Confirmed)

1. **Untracked exp display**: Show as a single indicator spanning the time range. In calendar grid views (month/week), appears as an info card at the top-right of the day cell. The "untracked" concept is **view-relative**: a 30-minute gap is NOT "untracked" at the day/week/month level, only at the hour level. Each record carries a `durationMs` so the UI knows which views should show it as untracked vs just folding it into totals.

2. **Stats page tab**: Only open if `syrnia.com/game.php` is active (user is playing). Close automatically after scraping completes.

3. **Untracked exp in totals**: Shown separately (visually distinct) but still counted toward totals for any time frame that fully encompasses the untracked window.

4. **Stale detection**: The game auto-logs out idle users, changing the URL away from `game.php`. This naturally stops the content script polling. The existing 5-minute `MAX_SCRAPE_GAP_MS` remains the threshold for detecting a gap within an active session.

5. **No retroactive detection**: Only detect untracked exp going forward from when this feature is deployed.

---

## Current Architecture (Key Flows)

### Content Script → Background → Storage → Panel

```
sendData.ts (polls ~2s, only on game.php)
  └─ hasExpIncreased() compares in-memory lastSeenExpBySkill map
     └─ if exp increased → scrapeScreenData() → chrome.runtime.sendMessage(UPDATE_SCREEN_DATA)

background/index.ts
  └─ processScreenData()
     ├─ Reads lastExpBySkill from storage ({skill: {exp, ts}})
     ├─ Calculates gainedExp delta
     ├─ Handles: first time (baseline), stale gap >5min (reset), normal (delta)
     ├─ Deduplicates by UUID+skill
     └─ appendTrackedData() → tracked_data_csv

stats/index.ts (runs on stats page only)
  └─ scrapeUserStats() → chrome.runtime.sendMessage(UPDATE_USER_STATS)
     └─ background saves to user_stats_csv
```

### Storage Keys
| Key | Purpose |
|-----|---------|
| `tracked_data_csv` | All tracked screen scrape data (CSVRow format) |
| `user_stats_csv` | Latest stats page snapshot (all skills with levels, totalExp) |
| `weekly_stats_csv` | Weekly aggregated stats |
| `last_exp_by_skill` | `Record<string, {exp: number, ts: number}>` for delta calc |
| `drop_gp_values` | Item GP values |

### Panel Hooks Chain
```
useTrackedDataQuery → reads tracked_data_csv
useTrackedDataMap → deduplicates above
useCalendarData → groups by time cells, calls aggregateRows()
usePeriodStats → groups by hour/day/week/month
useHourlyExp → current hour exp
useHourStats → specific hour stats
```

---

## Proposed Solution

### Phase 1: Session Baseline Snapshot

**Goal**: On every new session (when `game.php` is active), capture all skills' current level + totalExp as a reference point.

#### 1.1 New Storage Key: `session_baseline`

```ts
interface SessionBaseline {
  timestamp: string;           // ISO string when baseline was captured
  skills: Record<string, {
    level: number;
    totalExp: number;
  }>;
}
```

Storage key: `session_baseline`

#### 1.2 Background Service Worker: Session Start Detection

In `app/background/index.ts`, add listeners for session start:

```ts
chrome.runtime.onStartup.addListener(() => {
  captureSessionBaseline();
});

chrome.runtime.onInstalled.addListener(() => {
  captureSessionBaseline();
});
```

#### 1.3 Auto-Open Stats Page for Baseline (Requires Active Game Tab)

`captureSessionBaseline()` implementation:

1. **Gate on game.php**: First check that the user has an active `syrnia.com/game.php` tab. If not, do nothing — the extension should not act unless the user is playing.
   ```ts
   const gameTabs = await chrome.tabs.query({
     url: "*://*.syrnia.com/game.php*"
   });
   if (gameTabs.length === 0) return; // Not playing, do nothing
   ```

2. Check if a stats page tab is already open:
   ```ts
   const statsTabs = await chrome.tabs.query({
     url: "https://www.syrnia.com/theGame/includes2/stats.php*"
   });
   ```

3. If stats tab exists → reload it (`chrome.tabs.reload(tab.id)`)
4. If no stats tab → open new tab (`chrome.tabs.create({ url: statsUrl, active: false })`)
5. The stats content script fires and sends `UPDATE_USER_STATS`

#### 1.4 Auto-Close Stats Tab After Scraping

When `UPDATE_USER_STATS` is received in the background and the baseline is being captured:

```ts
// Track which tab was auto-opened for baseline capture
let autoOpenedStatsTabId: number | null = null;

// In captureSessionBaseline():
const tab = await chrome.tabs.create({ url: statsUrl, active: false });
autoOpenedStatsTabId = tab.id;

// In UPDATE_USER_STATS handler:
if (autoOpenedStatsTabId !== null) {
  // Save the baseline
  await saveSessionBaseline(baseline);
  // Close the auto-opened tab
  chrome.tabs.remove(autoOpenedStatsTabId).catch(() => {});
  autoOpenedStatsTabId = null;
}
```

#### 1.5 Baseline Pending Flag

- `baseline_pending = true` when `captureSessionBaseline()` starts
- `baseline_pending = false` when baseline is saved
- While pending, queue untracked exp detection for any new/stale skills detected by `processScreenData`

---

### Phase 2: New Skill Detection & Auto-Stats Fetch

**Goal**: When a skill being trained is detected for the first time, automatically open the stats page to get its full exp profile.

#### 2.1 Detection Point: `processScreenData()` in Background

Currently:
```ts
if (!lastEntry || lastEntry.exp === 0) {
  lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
  gainedExp = "0";
}
```

**Enhancement**: After detecting a new skill, trigger stats page fetch:

```ts
if (!lastEntry || lastEntry.exp === 0) {
  lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
  gainedExp = "0";

  // Trigger stats page fetch for comprehensive baseline
  triggerStatsPageFetch();
}
```

#### 2.2 `triggerStatsPageFetch()` Implementation

```ts
let lastStatsPageFetchTime = 0;
const STATS_FETCH_COOLDOWN = 30_000; // 30 seconds

const triggerStatsPageFetch = async () => {
  const now = Date.now();
  if (now - lastStatsPageFetchTime < STATS_FETCH_COOLDOWN) return;
  lastStatsPageFetchTime = now;

  // Gate: require game.php to be active
  const gameTabs = await chrome.tabs.query({
    url: "*://*.syrnia.com/game.php*"
  });
  if (gameTabs.length === 0) return;

  const statsTabs = await chrome.tabs.query({
    url: "https://www.syrnia.com/theGame/includes2/stats.php*"
  });

  if (statsTabs.length > 0 && statsTabs[0].id) {
    await chrome.tabs.reload(statsTabs[0].id);
  } else {
    const tab = await chrome.tabs.create({
      url: "https://www.syrnia.com/theGame/includes2/stats.php",
      active: false,
    });
    autoOpenedStatsTabId = tab.id ?? null;
  }
};
```

---

### Phase 3: Untracked Exp Detection & Storage

**Goal**: Detect exp gained outside tracking windows, store it separately with time ranges and duration metadata.

#### 3.1 New Type: `UntrackedExpRecord`

```ts
interface UntrackedExpRecord {
  id: string;              // UUID for this record
  skill: string;           // Skill name (e.g., "Cooking")
  expGained: number;       // Amount of exp gained while untracked
  startUTC: string;        // ISO timestamp - last tracked exp for this skill
  endUTC: string;          // ISO timestamp - when tracking resumed
  detectedAt: string;      // ISO timestamp - when this gap was detected
  totalExpBefore: number;  // Total exp at startUTC
  totalExpAfter: number;   // Total exp at endUTC
  durationMs: number;      // endUTC - startUTC in milliseconds
}
```

The `durationMs` field is key for **view-relative untracked display**:

| Duration | Untracked in these views | Folded into totals in |
|----------|--------------------------|----------------------|
| < 1 hour | Day (hour rows) | Week, Month, Year |
| 1-24 hours | Day, Week (day cells) | Month, Year |
| 1-7 days | Day, Week, Month (day cells) | Year |
| > 7 days | All views | - |

The UI logic: if a record's `durationMs` is smaller than the cell's time span, it is NOT shown as "untracked" in that view — it simply gets added to the totals. It is only shown as a visual untracked indicator when the duration matches or exceeds the cell's granularity.

**Inverted**: the untracked indicator is shown when the gap is **larger** than the cell's granularity (the gap spans beyond what the cell can contain, so the user can't see where within that gap the exp was gained).

Actually, let me reconsider. The intent is:
- A 30-min gap within a single hour: show `!` on that hour in day view, but at day/week/month level, the daily total just includes it — no indicator needed.
- A 3-hour gap within a single day: show `!` on affected hours in day view, but at week/month level, the daily total just includes it.
- A 2-day gap: show `!` on affected days in week/month view. In year view, monthly total includes it.

**Rule**: Show the untracked indicator on a cell when the untracked record's time range **overlaps** the cell's time range AND the record's duration is **shorter** than the parent view's cell duration (meaning it's granular enough to pinpoint). If the gap is shorter than the cell, just fold into totals silently.

Simplified rule: **Show `!` indicator when `durationMs` > cell's time span** (gap is bigger than what this cell represents, so the exp could have been gained anytime in that range — ambiguous). When `durationMs` <= cell's time span, fold silently into totals (the gap happened within this cell's window, so just add it).

#### 3.2 Detection Logic in `processScreenData()`

```ts
// Stale gap (>5 min) with exp increase
if (now - lastEntry.ts > MAX_SCRAPE_GAP_MS) {
  const untrackedDelta = mainSkillExp - lastEntry.exp;
  if (untrackedDelta > 0) {
    const startMs = lastEntry.ts;
    const endMs = now;
    await saveUntrackedExpRecord({
      id: crypto.randomUUID(),
      skill: mainSkill,
      expGained: untrackedDelta,
      startUTC: new Date(startMs).toISOString(),
      endUTC: new Date(endMs).toISOString(),
      detectedAt: new Date(endMs).toISOString(),
      totalExpBefore: lastEntry.exp,
      totalExpAfter: mainSkillExp,
      durationMs: endMs - startMs,
    });
  }
  // Reset baseline
  lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
  gainedExp = "0";
}
```

#### 3.3 Session Start Baseline Comparison

When `UPDATE_USER_STATS` arrives and we're capturing a session baseline:

```ts
const detectUntrackedFromBaseline = async (currentStats: UserStats) => {
  const lastExpBySkill = await getLastExpBySkill();

  for (const [skillName, currentStat] of Object.entries(currentStats.skills)) {
    const currentTotal = parseInt(currentStat.totalExp, 10) || 0;
    const lastTracked = lastExpBySkill[skillName];

    if (lastTracked && lastTracked.exp > 0 && currentTotal > lastTracked.exp) {
      const delta = currentTotal - lastTracked.exp;
      if (delta > 0) {
        const endMs = Date.now();
        await saveUntrackedExpRecord({
          id: crypto.randomUUID(),
          skill: skillName,
          expGained: delta,
          startUTC: new Date(lastTracked.ts).toISOString(),
          endUTC: new Date(endMs).toISOString(),
          detectedAt: new Date(endMs).toISOString(),
          totalExpBefore: lastTracked.exp,
          totalExpAfter: currentTotal,
          durationMs: endMs - lastTracked.ts,
        });

        // Update so we don't double-count
        lastExpBySkill[skillName] = { exp: currentTotal, ts: endMs };
      }
    }
  }

  await saveLastExpBySkill(lastExpBySkill);
};
```

#### 3.4 Storage Service Additions

```ts
// In storage-service.ts
const STORAGE_KEYS = {
  // ... existing keys ...
  SESSION_BASELINE: "session_baseline",
  UNTRACKED_EXP: "untracked_exp_records",
} as const;

const getSessionBaseline = async (): Promise<SessionBaseline | null> =>
  await getFromStorage(STORAGE_KEYS.SESSION_BASELINE, null);

const saveSessionBaseline = async (baseline: SessionBaseline): Promise<void> =>
  await setInStorage(STORAGE_KEYS.SESSION_BASELINE, baseline);

const getUntrackedExpRecords = async (): Promise<UntrackedExpRecord[]> =>
  await getFromStorage(STORAGE_KEYS.UNTRACKED_EXP, []);

const saveUntrackedExpRecord = async (record: UntrackedExpRecord): Promise<void> => {
  const existing = await getUntrackedExpRecords();
  existing.push(record);
  await setInStorage(STORAGE_KEYS.UNTRACKED_EXP, existing);
};
```

---

### Phase 4: Hook Integration

**Goal**: Make untracked exp available to all existing hooks and UI components.

#### 4.1 New Hook: `useUntrackedExp`

```ts
// app/hooks/data/useUntrackedExp.ts

interface UntrackedExpForPeriod {
  records: UntrackedExpRecord[];           // All records overlapping this period
  indicatorRecords: UntrackedExpRecord[];  // Only records that should show ! indicator
  totalBySkill: Record<string, number>;
  totalExp: number;
}

// Cell durations in ms for each view mode
const CELL_DURATION_MS: Record<string, number> = {
  hour: 60 * 60 * 1000,            // 1 hour (day view cells)
  day: 24 * 60 * 60 * 1000,        // 1 day (week/month view cells)
  month: 30 * 24 * 60 * 60 * 1000, // ~1 month (year view cells)
};

const useUntrackedExp = () => {
  const { data: records = [] } = useQuery({
    queryKey: ["untrackedExp"],
    queryFn: getUntrackedExpRecords,
    staleTime: 1000,
  });

  // Get records that overlap a time range
  const getRecordsInRange = (start: Date, end: Date): UntrackedExpRecord[] =>
    records.filter(record => {
      const rStart = new Date(record.startUTC).getTime();
      const rEnd = new Date(record.endUTC).getTime();
      return rStart < end.getTime() && rEnd > start.getTime();
    });

  // Get aggregated untracked exp for a time range, with view-relative indicator logic
  const getUntrackedForRange = (
    start: Date,
    end: Date,
    cellGranularity: "hour" | "day" | "month"
  ): UntrackedExpForPeriod => {
    const overlapping = getRecordsInRange(start, end);
    const cellDurationMs = CELL_DURATION_MS[cellGranularity];
    const totalBySkill: Record<string, number> = {};
    let totalExp = 0;

    // All overlapping records contribute to totals
    overlapping.forEach(record => {
      totalBySkill[record.skill] = (totalBySkill[record.skill] || 0) + record.expGained;
      totalExp += record.expGained;
    });

    // Only records whose gap duration > cell duration show the ! indicator
    // (gap is bigger than this cell can represent → ambiguous → show indicator)
    const indicatorRecords = overlapping.filter(r => r.durationMs > cellDurationMs);

    return { records: overlapping, indicatorRecords, totalBySkill, totalExp };
  };

  return { records, getRecordsInRange, getUntrackedForRange };
};
```

#### 4.2 Integrate into `useCalendarData`

```ts
export const useCalendarData = (viewMode: CalendarViewMode, currentDate: Date) => {
  const { allRows, loading } = useTrackedDataMap();
  const { itemValues } = useItemValuesQuery();
  const { getUntrackedForRange } = useUntrackedExp();

  // Map view mode to cell granularity
  const cellGranularity = viewMode === "day" ? "hour"
    : viewMode === "year" ? "month"
    : "day"; // week and month views use day cells

  const cellData = useMemo(() => {
    const map = new Map<string, CalendarCellData>();
    // ... existing grouping logic (unchanged) ...

    // After building cells, augment with untracked exp
    // For each cell, compute its date range and merge untracked data
    map.forEach((cell, key) => {
      const { start, end } = getCellDateRange(viewMode, currentDate, key);
      const untracked = getUntrackedForRange(start, end, cellGranularity);

      if (untracked.totalExp > 0) {
        // Add untracked exp to totals
        cell.totalExp += untracked.totalExp;
        Object.entries(untracked.totalBySkill).forEach(([skill, exp]) => {
          cell.expBySkill[skill] = (cell.expBySkill[skill] || 0) + exp;
        });
      }

      // Only flag as untracked if there are indicator-worthy records
      if (untracked.indicatorRecords.length > 0) {
        cell.hasUntrackedExp = true;
        cell.untrackedRecords = untracked.indicatorRecords;
      }
    });

    return map;
  }, [viewMode, currentDate, allRows, itemValues, getUntrackedForRange, cellGranularity]);

  return { cellData, getCell, loading };
};
```

#### 4.3 Helper: `getCellDateRange`

```ts
// Compute the start/end dates for a cell key given the view mode
const getCellDateRange = (
  viewMode: CalendarViewMode,
  currentDate: Date,
  key: string
): { start: Date; end: Date } => {
  if (viewMode === "year") {
    // key is month index (0-11)
    const month = parseInt(key, 10);
    const y = currentDate.getFullYear();
    return {
      start: new Date(y, month, 1, 0, 0, 0, 0),
      end: new Date(y, month + 1, 0, 23, 59, 59, 999),
    };
  }
  if (viewMode === "month" || viewMode === "week") {
    // key is "YYYY-MM-DD"
    const [y, m, d] = key.split("-").map(Number);
    return {
      start: new Date(y, m - 1, d, 0, 0, 0, 0),
      end: new Date(y, m - 1, d, 23, 59, 59, 999),
    };
  }
  // day view: key is hour (0-23)
  const hour = parseInt(key, 10);
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const d = currentDate.getDate();
  return {
    start: new Date(y, m, d, hour, 0, 0, 0),
    end: new Date(y, m, d, hour, 59, 59, 999),
  };
};
```

#### 4.4 Integrate into `usePeriodStats`

Similarly, inject untracked exp into each period's `skills` and `totalGainedExp`. Add `hasUntrackedExp` and `untrackedRecords` to `PeriodStats`.

---

### Phase 5: Calendar UI - Untracked Exp Indicators

**Goal**: Show visual indicators in the calendar for time periods with untracked exp.

#### 5.1 CalendarCellData Extension

```ts
// In types.ts
interface CalendarCellData extends AggregatedStats {
  hasData: boolean;
  hasUntrackedExp?: boolean;
  untrackedRecords?: UntrackedExpRecord[];
}
```

#### 5.2 DayView: Untracked Exp Info Card in Hour Rows

In `views/DayView.tsx`, when an hour has untracked records, render an info card:

```tsx
const UntrackedExpCard = memo(({ records }: { records: UntrackedExpRecord[] }) => {
  // Group by skill for display
  const bySkill: Record<string, number> = {};
  records.forEach(r => {
    bySkill[r.skill] = (bySkill[r.skill] || 0) + r.expGained;
  });

  const earliest = records.reduce(
    (min, r) => (r.startUTC < min ? r.startUTC : min),
    records[0].startUTC
  );
  const latest = records.reduce(
    (max, r) => (r.endUTC > max ? r.endUTC : max),
    records[0].endUTC
  );

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full
                         bg-yellow-500/20 text-yellow-600">
            <AlertCircle className="h-3 w-3" />
          </div>
          <CardTitle className="text-xs text-yellow-600">Untracked Experience</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {Object.entries(bySkill)
            .sort(([, a], [, b]) => b - a)
            .map(([skill, exp]) => (
              <Badge key={skill} className="bg-yellow-500/10 text-yellow-700">
                {skill}: {formatExp(exp)} exp
              </Badge>
            ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Gained between {new Date(earliest).toLocaleTimeString()} -
          {new Date(latest).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
});
```

#### 5.3 CalendarCell: Info Card at Top-Right

In month/week views, when a day cell has untracked exp, show a small info badge at top-right:

```tsx
{cell.hasUntrackedExp && cell.untrackedRecords && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center
                      rounded-full bg-yellow-500/20 text-yellow-600 cursor-help">
        <span className="text-[8px] font-bold">!</span>
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[200px]">
      <p className="text-xs font-medium">Untracked Experience</p>
      {cell.untrackedRecords.map(r => (
        <p key={r.id} className="text-[10px] text-muted-foreground">
          {formatExp(r.expGained)} {r.skill} exp
        </p>
      ))}
    </TooltipContent>
  </Tooltip>
)}
```

Note: CalendarCell currently uses `className` without `relative` positioning. Will need to add `relative` to the outer wrapper.

---

## Implementation Order

### Step 1: Types & Storage (Foundation)
- [ ] Add `UntrackedExpRecord` type to `app/types/index.ts`
- [ ] Add `SessionBaseline` type to `app/types/index.ts`
- [ ] Add `SESSION_BASELINE` and `UNTRACKED_EXP` to `STORAGE_KEYS` in `storage-service.ts`
- [ ] Add storage functions: `getSessionBaseline`, `saveSessionBaseline`, `getUntrackedExpRecords`, `saveUntrackedExpRecord`
- [ ] Export new functions from `storage-service.ts`

### Step 2: Background Service Worker (Core Logic)
- [ ] Add `chrome.runtime.onStartup` listener
- [ ] Add `chrome.runtime.onInstalled` listener
- [ ] Implement `captureSessionBaseline()`:
  - Gate on `game.php` being active
  - Open/reload stats page tab
  - Track auto-opened tab ID for auto-close
- [ ] Implement `triggerStatsPageFetch()` with 30s debounce:
  - Same game.php gate
  - Same tab management
  - Same auto-close behavior
- [ ] Modify `processScreenData()`:
  - On stale gap with exp delta → call `saveUntrackedExpRecord()`
  - On first-time skill → call `triggerStatsPageFetch()`
- [ ] Modify `UPDATE_USER_STATS` handler:
  - If baseline pending → save `SessionBaseline`, close auto-opened tab
  - Call `detectUntrackedFromBaseline()` to compare all skills

### Step 3: Data Hooks (Integration Layer)
- [ ] Create `app/hooks/data/useUntrackedExp.ts`:
  - `useUntrackedExp()` hook with `getRecordsInRange()`, `getUntrackedForRange()`
  - View-relative indicator logic using `durationMs` vs cell granularity
- [ ] Create `app/hooks/data/useSessionBaseline.ts` (simple query hook)
- [ ] Modify `useCalendarData.ts`:
  - Add `getCellDateRange()` helper
  - Merge untracked exp into cell totals
  - Set `hasUntrackedExp` + `untrackedRecords` on cells with indicator-worthy records
- [ ] Modify `usePeriodStats.ts`:
  - Add untracked exp to period `skills` and `totalGainedExp`
  - Add `hasUntrackedExp` and `untrackedRecords` to `PeriodStats`
- [ ] Update barrel exports in `app/hooks/data/index.ts` and `app/hooks/index.ts`

### Step 4: Calendar UI (Visualization)
- [ ] Extend `CalendarCellData` in `Calendar/types.ts` with `hasUntrackedExp?`, `untrackedRecords?`
- [ ] Modify `CalendarCell.tsx`:
  - Add `relative` positioning to outer wrapper
  - Add `!` badge with Tooltip at top-right for cells with untracked exp
- [ ] Modify `DayView.tsx`:
  - Add `UntrackedExpCard` component
  - Render between/within hour segments when untracked records overlap
- [ ] Ensure Tooltip component is available (check if already imported or need to add)

### Step 5: Edge Cases & Cleanup
- [ ] Handle first-ever extension install (no `lastExpBySkill` exists) — skip untracked detection, just set baselines
- [ ] Handle extension update — same as fresh install for untracked detection purposes
- [ ] Prevent duplicate untracked records (deduplicate by skill + overlapping time ranges)
- [ ] Handle multiple untracked records for the same skill in overlapping time ranges (merge them)
- [ ] Stats tab auto-close: add timeout fallback (close after 10s even if no UPDATE_USER_STATS received)

---

## File Changes Summary

| File | Changes |
|------|---------|
| `app/types/index.ts` | Add `UntrackedExpRecord`, `SessionBaseline` types |
| `app/utils/storage-service.ts` | Add `SESSION_BASELINE` + `UNTRACKED_EXP` keys, 4 new functions |
| `app/background/index.ts` | Add startup listeners, `captureSessionBaseline()`, `triggerStatsPageFetch()`, modify `processScreenData()`, modify `UPDATE_USER_STATS` handler |
| `app/hooks/data/useUntrackedExp.ts` | **NEW** - Hook with view-relative indicator logic |
| `app/hooks/data/useSessionBaseline.ts` | **NEW** - Simple query hook for session baseline |
| `app/hooks/data/index.ts` | Export new hooks |
| `app/hooks/index.ts` | Export new hooks |
| `app/panel/components/Calendar/types.ts` | Extend `CalendarCellData` with untracked fields |
| `app/panel/components/Calendar/useCalendarData.ts` | Add `getCellDateRange()`, merge untracked exp, set indicator flags |
| `app/panel/components/Calendar/views/DayView.tsx` | Add `UntrackedExpCard` component, render in segments |
| `app/panel/components/Calendar/CalendarCell.tsx` | Add `relative` positioning, `!` badge with Tooltip |
| `app/hooks/stats/usePeriodStats.ts` | Merge untracked exp into period stats |

### Files NOT Changed
- `app/content/` — Content scripts unchanged, they already scrape correctly
- `app/utils/csv-tracker.ts` — CSV format unchanged, untracked exp is stored separately (JSON, not CSV)
- `manifest.js` — No new permissions needed (`tabs` permission already exists)
