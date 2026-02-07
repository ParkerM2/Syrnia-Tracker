# Data Scraping Flow - Complete Documentation

## Overview
The extension scrapes game data when **fight ends are detected**, processes it through deduplication logic, saves to storage, and updates the UI cache in real-time.

---

## 1. When Scrapes Fire

### Primary Trigger: Experience Increase Detection
A scrape fires when **total exp increases for any skill**, detected by:

#### Detection Method: Skill Level Info Parsing
```
Example text after fight ends:
"The Rusalka died. You got 213 defence experience.
You also gained 22 defence experience from your dragon armour!
Defence level: 133 (28343195 exp, 573592 for next level)"

Parser extracts:
- Skill: "Defence"  
- Total Exp: 28343195
- Level: 133
- Exp for Next: 573592
```

#### Watchers:
1. **MutationObserver** (Primary - watches `#centerContent`)
   - Monitors text changes in centerContent
   - Detects when skill level info appears/updates
   - Pattern: `/\w+\s+level:\s+\d+\s+\(\d+\s+exp,\s+\d+\s+for\s+next\s+level\)/i`
   
2. **Periodic Check** (Fallback - every 2 seconds)
   - Calls `parseSkillLevels()` to check all visible skills
   - Compares total exp to cached values
   - Catches cases where MutationObserver might miss

### Exp Comparison Logic:
```typescript
lastSeenExpBySkill: Map<string, number>

For each skill found:
  1. If skill not in map → Initialize (don't scrape)
  2. If totalExp > lastSeenExpBySkill[skill] → SCRAPE! (fight ended)
  3. If totalExp === lastSeenExpBySkill[skill] → Skip (no change)
```

### Anti-Duplication Guards:
```typescript
// Natural deduplication via exp comparison:
1. Only scrapes when total exp INCREASES
2. Each skill tracked independently
3. isProcessingFight flag (prevents concurrent scrapes)
4. No duplicates possible - exp only increases once per fight
```

---

## 2. What Data is Scraped

### From `scrapeScreenData()`:

```typescript
ScreenData {
  // Main skill being trained
  actionText: {
    currentActionText: string,    // Skill name (e.g., "Mining")
    exp: string,                   // Total exp for this skill
    skillLevel: string,            // Current skill level
    expForNextLevel: string,       // Exp needed for next level
    speedText: string,             // Activity speed
    addExp: string,                // Base exp gain per action
    
    inventory: {
      hp: string,                  // Current HP display
      farmingExp: string,          // Farming exp if applicable
    },
    
    // Combat-specific data
    combatExp: CombatExpGain[],    // Array of {skill, exp} for combat skills
    drops: string[],               // Item drops from monsters
  },
  
  // Combat metadata
  monster: string,                 // Monster name being fought
  location: string,                // Location name
  damageDealt: string[],           // Array of damage values dealt
  damageReceived: string[],        // Array of damage values received
  peopleFighting: number | null,   // Number of people at location
  
  // Fight tracking
  totalFights: number,             // Set to 1 when fight ends
  totalInventoryHP: string,        // Current HP from inventory
  hpUsed: number,                  // Sum of damageReceived array
  
  // Equipment snapshot at fight end
  equipment: {
    helm, shield, body, weapon, legs, gloves, boots, horse, trophy: {
      name: string,
      stats: string,
      enchant: string,
      imageUrl: string,
    },
    totals: {
      armour: number,
      aim: number,
      power: number,
      travelTime: number,
    }
  },
  
  // Metadata
  timestamp: string,               // ISO timestamp
  uuid: string,                    // Unique identifier (v4 UUID)
}
```

---

## 3. Data Flow Path

### Step 1: Content Script → Background
```
Content Script (sendData.ts)
  ├─ Detects fight end
  ├─ Calls scrapeScreenData()
  ├─ Sets totalFights = 1
  └─ Sends chrome.runtime.sendMessage({
      type: UPDATE_SCREEN_DATA,
      data: ScreenData
    })
```

### Step 2: Background Processing
```
Background Script (background/index.ts)
  ├─ Receives UPDATE_SCREEN_DATA message
  ├─ Calls processScreenData(data)
  │   ├─ Converts to CSV rows (screenDataToCSVRows)
  │   ├─ Calculates gainedExp (exp delta since last scrape)
  │   ├─ Deduplication logic (by UUID + skill)
  │   ├─ Filters incomplete rows
  │   └─ Returns dataSaved: boolean
  │
  ├─ If dataSaved === true:
  │   ├─ appendTrackedData(rows) → saves to 'tracked_data_csv'
  │   ├─ updateWeeklyStats()
  │   └─ Sends message to side panel:
  │       chrome.runtime.sendMessage({
  │         type: UPDATE_SCREEN_DATA,
  │         data: ScreenData
  │       })
  │
  └─ If dataSaved === false:
      └─ No message sent (duplicate/incomplete data)
```

### Step 3: Storage Service
```
storage-service.ts (appendTrackedData)
  ├─ Gets existing CSV from 'tracked_data_csv'
  ├─ Converts new rows to CSV strings
  ├─ Appends to existing CSV
  └─ Saves back to chrome.storage.local
```

### Step 4: Side Panel Cache Update
```
Side Panel (useGlobalDataSync hook)
  ├─ Receives UPDATE_SCREEN_DATA message
  ├─ Calls getTrackedData() to fetch fresh data
  ├─ Updates QueryClient cache directly:
  │   queryClient.setQueryData(
  │     ['trackedData'],
  │     freshData
  │   )
  │
  └─ All components using useTrackedDataQuery()
      automatically see new data
```

### Step 5: UI Components Update
```
Components using cached data automatically re-render:
  ├─ Dashboard
  ├─ Performance (Stats page)
  ├─ LootMap
  ├─ TrackedHistory
  └─ DataView ← Your new component!
```

---

## 4. Deduplication Logic

### Level 1: Content Script
```typescript
// Prevent same fight from being scraped multiple times
- Compare fight log text content (unique identifier)
- Check if total exp changed (same exp = same fight)
- Track processed fights in Set
```

### Level 2: Background Script
```typescript
// Deduplicate before saving to storage
Map<string, CSVRow> keyed by:
  - Primary: UUID + skill (reliable for new format)
  - Fallback: timestamp + monster + skill + gainedExp
  
Rules:
  - Keep row with most complete data
  - Merge drops from duplicate rows
  - Only count totalFights once per unique fight
```

### Result:
- Each unique fight is saved exactly once
- No duplicate exp counting
- No inflated stats

---

## 5. Cache Update Strategy

### Optimized Approach (Current):
```typescript
// Direct cache update (efficient)
const freshData = await getTrackedData();
queryClient.setQueryData(TRACKED_DATA_QUERY_KEY, freshData);
```

**Benefits:**
- Single storage read
- Instant UI update
- No refetch delay
- More efficient than invalidate + refetch

### Backup Mechanism:
```typescript
// Storage change listener
chrome.storage.onChanged.addListener((changes) => {
  if (changes.tracked_data_csv) {
    // Also updates cache directly
    const freshData = await getTrackedData();
    queryClient.setQueryData(TRACKED_DATA_QUERY_KEY, freshData);
  }
});
```

---

## 6. Why Exp-Based Detection is Better

### Old Approach (Fight Log Detection):
❌ Fight log always visible during combat
❌ Multiple timer checks and complex text comparisons
❌ Needed Set tracking for processed fights
❌ Could miss fights or duplicate scrapes
❌ Only worked for combat with `#fightLogTop`

### New Approach (Exp Increase Detection):
✅ Exp only increases ONCE per fight completion
✅ Natural deduplication (no Set tracking needed)
✅ Works for ANY skill (not just combat)
✅ Simpler logic = less code = fewer bugs
✅ More reliable - exp is source of truth
✅ Easier to extend for tracking other activities

### Example Flow:
```
User fights Rusalka
  ↓
Fight ends → skill level info appears
  ↓
"Defence level: 133 (28343195 exp, 573592 for next level)"
  ↓
Parser detects: Defence exp = 28343195
  ↓
Compare to cached: lastSeenExpBySkill["Defence"] = 28343000
  ↓
28343195 > 28343000 → EXP INCREASED!
  ↓
Trigger scrape → Save all fight data
  ↓
Update cache: lastSeenExpBySkill["Defence"] = 28343195
```

---

## 7. Performance Optimizations

### Content Script:
1. **Targeted MutationObserver**: Only watches `#centerContent`
2. **Simple Exp Comparison**: Just Map lookup and number comparison
3. **Early Exit**: If exp unchanged (most of the time)
4. **No Complex Tracking**: Removed Set, fight log text comparison, etc.
5. **Smaller Bundle**: Reduced from 17.03 kB to 15.84 kB

### Background Script:
1. **Early Validation**: Filters incomplete rows before saving
2. **Efficient Deduplication**: Map-based O(n) deduplication
3. **Batch Operations**: Saves all rows in single storage write
4. **No Message if No Save**: Only sends UPDATE message when data actually saved

### Side Panel:
1. **Global Listeners**: Always active (no mount/unmount overhead)
2. **Direct Cache Update**: No invalidation cascade
3. **Single Storage Read**: Per update instead of invalidate + refetch
4. **Shared Cache**: All components use same data, no duplication

---

## 8. Data Integrity

### Ensures Accuracy By:
1. **UUID per scrape**: Each screen scrape gets unique identifier
2. **Exp Delta Calculation**: Tracks lastExpBySkill to calculate accurate gains
3. **First Scrape Handling**: Doesn't count total exp as gained exp on first scrape
4. **Negative Delta Protection**: Ignores negative exp changes (stat page refreshes)
5. **Zero Delta Skip**: Doesn't save rows with no exp gain (unless fight data exists)

---

## 9. File Structure

```
Content Scripts (pages/content/src/):
  ├─ sendData.ts          - Fight detection & scrape triggering
  └─ scrapeScreenData.ts  - Data extraction from DOM

Background (chrome-extension/src/background/):
  └─ index.ts             - Message handling, processing, storage

Shared Utilities (packages/shared/lib/utils/):
  ├─ csv-tracker.ts       - CSV row conversion & parsing
  ├─ storage-service.ts   - Storage operations
  └─ types.ts             - TypeScript interfaces

Side Panel (pages/side-panel/src/):
  ├─ hooks/useGlobalDataSync.ts  - Global cache sync
  └─ components/DataView/         - Your new data viewer

Query Hooks (packages/shared/lib/hooks/):
  └─ useTrackedDataQuery.ts  - React-Query hook for tracked data
```

---

## 10. Key Takeaways

✅ **Scrapes fire**: When total exp increases (natural fight end detection)
✅ **Trigger source**: `#centerContent` skill level info parsing
✅ **No false triggers**: Exp only increases once per fight completion
✅ **Data saved**: To `'tracked_data_csv'` in chrome.storage.local
✅ **Cache updated**: Via direct `setQueryData` (efficient)
✅ **UI updates**: Instantly across all components
✅ **Deduplication**: Natural via exp comparison (no complex tracking needed)
✅ **Performance**: Optimized for minimal overhead and I/O
✅ **Extensible**: Works for ANY skill that shows level info (not just combat)
