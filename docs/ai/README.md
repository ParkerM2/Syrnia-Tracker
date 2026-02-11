# AI Documentation

Machine-readable documentation for AI agents working on Syrnia Tracker.

## Files

| File | Purpose |
|------|---------|
| `system-index.json` | Module index with paths, exports, dependencies, and data flow |
| `README.md` | This file — instructions for using the documentation |

## How to Use `system-index.json`

### Module Lookup

Every module has a unique ID (e.g., `"utils/csv-tracker"`). To find details:

```json
modules["utils/csv-tracker"] → {
  "path": "app/utils/csv-tracker.ts",
  "purpose": "...",
  "exports": ["CSVRow", "screenDataToCSVRows", ...],
  "dependencies": ["@app/types"],
  "dataFlow": "ScreenData → CSVRow[]"
}
```

### Domain Browsing

Modules are grouped by domain. To find all hooks:

```json
domains["hooks"].modules → ["hooks/data/useTrackedDataQuery", "hooks/stats/useHourStats", ...]
```

### Dependency Tracing

To understand what a module depends on, read its `dependencies` array. To find what depends ON a module, search for its path across all modules' dependency arrays.

Example — what uses `csv-tracker`?
- `utils/csv-storage` (storage operations)
- `hooks/data/useTrackedDataQuery` (React Query integration)
- `background` (processes screen data)

### Data Flow

The `dataFlowSummary` field shows the end-to-end pipeline:

```
DOM → sendData.ts → scrapeScreenData.ts → chrome.runtime.sendMessage
  → background/index.ts → chrome.storage → useTrackedDataQuery → UI
```

Each module's `dataFlow` field shows its local input/output.

## Key Conventions

### Imports

All app imports use the `@app/*` alias:

```ts
import { useStorage } from "@app/hooks";
import { cn } from "@app/utils/cn";
import type { CSVRow } from "@app/types";
```

### Hook Pattern

All business logic lives in hooks. Components are presentational:

```
useDashboard.ts → { currentHourData, previousHourData }
Dashboard/index.tsx → renders HourCard with data from hook
```

### CSV Format

Tracked data is stored as CSV in `chrome.storage.local` under key `tracked_data_csv`. The `CSVRow` interface in `utils/csv-tracker.ts` defines the canonical format (currently 18 fields). `csvRowToObject()` handles 10+ backward-compatible format versions (6-18 fields).

### Storage Keys

| Key | Contents | Managed By |
|-----|----------|------------|
| `tracked_data_csv` | CSV string of all tracked rows | `utils/csv-storage.ts` |
| `user_stats_csv` | CSV of stats page data | `utils/user-stats-storage.ts` |
| `weekly_stats_csv` | CSV of weekly aggregates | `utils/weekly-stats-storage.ts` |
| `item_values` | JSON map of item GP values | `utils/storage-service.ts` |
| `last_exp_by_skill` | JSON map of last seen exp per skill | `utils/storage-service.ts` |
| `theme-storage-key` | Theme state (dark mode, theme name) | `utils/storage/theme-storage.ts` |
| `custom-themes-storage-key` | Custom theme definitions | `utils/storage/custom-themes-storage.ts` |

### Message Types

Content scripts communicate with the background via `chrome.runtime.sendMessage`:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `UPDATE_SCREEN_DATA` | content → background → panel | New screen data scraped |
| `UPDATE_USER_STATS` | content → background → panel | Stats page scraped |
| `REQUEST_SCREEN_DATA` | panel → background → content | Request fresh scrape |

## Maintenance Rule

**When creating or modifying modules, update `system-index.json`:**

1. **New module** — add entry to `modules` object and the appropriate `domains[].modules` array
2. **Changed exports** — update the `exports` array
3. **Changed dependencies** — update the `dependencies` array
4. **Deleted module** — remove from both `modules` and `domains`
5. **Bump `lastUpdated`** to the current date
