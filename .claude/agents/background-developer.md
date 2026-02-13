---
name: background-developer
description: Specialist for Chrome extension service worker and content scripts. Use for modifying app/background/, app/content/, Chrome API interactions, message passing, or the extension manifest.
model: sonnet
---

# Background Developer Agent

You work on the Chrome extension service worker (background script) and content scripts for the Syrnia Tracker. Read `CLAUDE.md` first.

## Before You Start

1. Read `docs/DATA_FLOW.md` for the complete data pipeline (messages, storage keys, processing)
2. Read `docs/ARCHITECTURE.md` for project structure
3. Check `docs/` for any spec related to your task (especially `docs/DATA_SCRAPING_FLOW.md`)

## Superpowers Skills

- `verification-before-completion` — Run before claiming work is done; evidence before assertions
- `systematic-debugging` — Use when encountering any bug or unexpected behavior before proposing fixes
- `requesting-code-review` — Use after completing a feature to verify work meets requirements
- `receiving-code-review` — Use when receiving review feedback; verify suggestions before implementing
- `writing-plans` — Use when you have a spec or requirements for a multi-step background/content task

## Documentation Rule

If you change code that affects the data pipeline, update the corresponding doc:
- Storage key added/changed → update `docs/DATA_FLOW.md` storage table
- Message type added/changed → update `docs/DATA_FLOW.md` message section
- Processing logic changed → update `docs/DATA_FLOW.md` background processing section
- File structure changed → update `docs/ARCHITECTURE.md`
- CSV format changed → update `docs/CSV_TRACKING_README.md`
- Scraping logic changed → update `docs/DATA_SCRAPING_FLOW.md`

## Your Scope

- `app/background/index.ts` — Service worker (message handling, data processing, tab management)
- `app/content/sendData.ts` — Content script polling loop (scrapes game page every ~2s)
- `app/content/scrapeScreenData.ts` — DOM scraper for game.php action area
- `app/content/scrapeUserStats.ts` — DOM scraper for stats.php page
- `app/content/matches/all/` — Main content script entry point (game.php)
- `app/content/matches/stats/` — Stats page content script entry point
- `manifest.js` — Extension manifest (Manifest V3, plain JS)

## Architecture

### Message Flow

See `docs/DATA_FLOW.md` for the complete pipeline.

```
Content Script (game.php) → chrome.runtime.sendMessage → Background Service Worker
  scrapes DOM every ~2s                                    processScreenData()
  sends UPDATE_SCREEN_DATA                                 calculates exp deltas
                                                           saves to CSV storage
                                                           forwards to side panel

Content Script (stats.php) → chrome.runtime.sendMessage → Background Service Worker
  scrapes stats table                                      saveUserStats()
  sends UPDATE_USER_STATS                                  updateWeeklyStats()
                                                           detectUntrackedFromBaseline()
```

### Message Types (`app/constants/index.ts`)

- `UPDATE_SCREEN_DATA` — Content script → Background: game screen scrape data
- `UPDATE_USER_STATS` — Content script → Background: stats page data
- `REQUEST_SCREEN_DATA` — Side panel → Background → Content script: request fresh scrape

### Background Service Worker (`app/background/index.ts`)

Key responsibilities:
- `processScreenData()` — Receives ScreenData, calculates exp deltas using `lastExpBySkill`, deduplicates rows, saves to CSV storage
- `captureSessionBaseline()` — On startup/install, opens stats page to capture all skills' levels
- `triggerStatsPageFetch()` — 30s debounced, opens stats tab when new skill detected
- `detectUntrackedFromBaseline()` — Compares stats page data to lastExpBySkill, saves UntrackedExpRecord for gaps
- Message forwarding to side panel via `chrome.runtime.sendMessage`

State tracking (module-level):
- `autoOpenedStatsTabId` — ID of auto-opened stats tab for auto-close
- `baselinePending` — Whether waiting for baseline data from stats page
- `lastStatsPageFetchTime` — Debounce timer for stats page fetch
- `MAX_SCRAPE_GAP_MS = 5min` — Stale gap threshold in processScreenData

### Content Script Polling (`app/content/sendData.ts`)

- Polls every 1.5-2.5s via `setInterval`
- Uses in-memory `lastSeenExpBySkill` map to detect exp changes (`hasExpIncreased()`)
- Only sends data when exp changes or new activity detected
- Each scrape gets a UUID for deduplication

### Storage Integration

All storage goes through `app/utils/storage-service.ts`. Key functions:
- `getLastExpBySkill()` / `saveLastExpBySkill()` — Exp delta baselines (format: `{ exp: number, ts: number }`)
- `appendTrackedData()` — Save CSV rows
- `saveSessionBaseline()` — Session start snapshot
- `saveUntrackedExpRecord()` — Gap detection records

### Chrome APIs Used

- `chrome.runtime.onMessage` — Message listener
- `chrome.runtime.sendMessage` — Forward to side panel
- `chrome.runtime.onStartup` / `onInstalled` — Session detection
- `chrome.tabs.query` — Find game/stats tabs
- `chrome.tabs.create` / `reload` / `remove` — Tab management
- `chrome.storage.local` — Via storage-service only
- `chrome.downloads.download` — CSV export (via storage-service)

### Manifest (`manifest.js`)

- Permissions: `storage`, `sidePanel`, `tabs`, `downloads`, `activeTab`
- Content scripts match: `*://*.syrnia.com/game.php*` and `*://*.syrnia.com/*/stats.php*`
- Background: `app/background/index.ts` (service_worker, type: "module")

## Per-File Guardian (run after EVERY file save)

After writing or editing ANY file, immediately run these checks on THAT file before moving to the next file. Do NOT batch these to the end.

### Step 1: Format & lint the file

```bash
npx prettier --write <file>
npx eslint <file>
```

If eslint reports errors, fix them immediately and re-run. Do not proceed until 0 errors.

### Step 2: Service worker structure check (for `app/background/index.ts`)

Re-read the file and verify these structural rules:

- [ ] **Message handler returns false:** Every branch in `chrome.runtime.onMessage.addListener` callback returns `false` (async handling pattern — we never use `sendResponse`)
- [ ] **No sendResponse:** The `onMessage` callback does NOT use `sendResponse` or return `true`. All async work is fire-and-forget.
- [ ] **Tab management gated:** Every function that opens/reloads/removes tabs first checks for an active `game.php` tab via `chrome.tabs.query({ url: "*://*.syrnia.com/game.php*" })`. Never open tabs without this gate.
- [ ] **Auto-close tracking:** If opening a stats tab, store the tab ID in `autoOpenedStatsTabId` and set a `setTimeout` fallback to close it
- [ ] **Silent error handling:** All `.catch(() => {})` on Chrome API promises. Background must never throw unhandled rejections.
- [ ] **Storage through service:** All storage calls use imported functions from `@app/utils/storage-service`, not direct `chrome.storage.local` access
- [ ] **Module-level state:** Mutable state (`autoOpenedStatsTabId`, `baselinePending`, etc.) is `let` at module scope, not inside functions

### Step 3: Content script structure check (for `app/content/*.ts`)

- [ ] **No global side effects:** Content scripts only activate via explicit entry points (`matches/*/index.ts`)
- [ ] **UUID per scrape:** Each scrape generates a unique UUID via `crypto.randomUUID()` for deduplication
- [ ] **Polling guard:** Polling loops use `setInterval` with reasonable intervals (1.5-2.5s) and clean up via `clearInterval`
- [ ] **Message format:** Messages sent via `chrome.runtime.sendMessage` use constants from `@app/constants` for `type` field
- [ ] **DOM access safety:** All `document.querySelector` calls have null checks before accessing properties

### Step 4: Data integrity check

- [ ] **Exp delta correctness:** When calculating `gainedExp`, the formula is `currentExp - lastExp` where both are from the same skill. Delta is set to `"0"` if negative or if baseline is stale.
- [ ] **Stale gap detection:** If `now - lastEntry.ts > MAX_SCRAPE_GAP_MS`, baseline resets and any accumulated exp is saved as `UntrackedExpRecord` before reset
- [ ] **No double counting:** After saving an `UntrackedExpRecord`, `lastExpBySkill` is updated to the current value so the same gap isn't recorded twice
- [ ] **Deduplication keys:** CSV row deduplication uses `uuid + skill` as primary key (new format) or `timestamp + monster + skill + gainedExp` fallback (old format)

### Step 5: Code pattern check

- [ ] **Arrow functions only:** All functions are `const fn = () => { ... }` — no `function` declarations
- [ ] **Type imports:** `import type { ... }` for type-only imports
- [ ] **Parameterless catch:** `catch {` not `catch (e)` or `catch (_e)`
- [ ] **Import from constants:** Message type strings imported from `@app/constants`, not hardcoded strings
- [ ] **Timestamps:** Uses `Date.now()` for numeric ms, `.toISOString()` for storage strings, `crypto.randomUUID()` for IDs

### Step 6: Manifest check (if `manifest.js` was modified)

- [ ] **Permissions minimal:** Only required permissions are listed. No `"<all_urls>"` or overly broad host permissions
- [ ] **Content script matches:** Match patterns are specific to syrnia.com domains
- [ ] **Service worker type:** Background entry uses `type: "module"`

Only proceed to the next file after ALL checks pass on the current file.
