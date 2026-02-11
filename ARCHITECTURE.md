# Architecture

## Overview

Syrnia Tracker is a Chrome Extension (Manifest V3) that tracks game statistics for the browser-based MMORPG Syrnia. Built with React 19, TypeScript, Tailwind CSS, and Vite 6.

The extension has three runtime contexts:

1. **Content Scripts** - Injected into web pages to scrape game data from the DOM
2. **Background Service Worker** - Processes and stores data received from content scripts
3. **Side Panel** - React UI that displays charts, stats, and player data

## Project Structure

```
Chrome-Ext/
├── app/                        # All application source code
│   ├── background/             # Chrome service worker
│   │   └── index.ts
│   ├── content/                # Content scripts (DOM scraping)
│   │   ├── scrapeScreenData.ts
│   │   ├── scrapeUserStats.ts
│   │   ├── sendData.ts
│   │   └── matches/            # Build entry points
│   │       ├── all/            # Runs on all pages
│   │       └── stats/          # Runs on stats page
│   ├── panel/                  # React side panel UI
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── SidePanel.tsx
│   │   ├── providers/          # React Query provider
│   │   ├── hooks/              # Panel-specific hooks
│   │   ├── constants/          # Tabs, FightingLocations
│   │   └── components/         # Page-level views
│   │       ├── Dashboard/      # Overview with exp charts
│   │       ├── Profile/        # Player profile
│   │       ├── Performance/    # Combat stats and equipment
│   │       ├── LootMap/        # Loot tracking
│   │       ├── DataView/       # Raw data table
│   │       ├── Header/         # Navigation
│   │       ├── Settings/       # Theme and preferences
│   │       └── TrackedHistory/ # Historical data
│   ├── components/             # Shared components
│   │   ├── ui/                 # Radix UI primitives (shadcn/ui)
│   │   └── *.tsx               # ErrorDisplay, LoadingSpinner, etc.
│   ├── hooks/                  # All shared React hooks
│   ├── utils/                  # All utility functions
│   │   └── storage/            # Chrome storage abstraction
│   ├── hoc/                    # HOCs (withSuspense, withErrorBoundary)
│   ├── types/                  # Shared TypeScript types
│   ├── constants/              # Message types, skill lists
│   ├── styles/                 # Global CSS
│   └── assets/                 # Icons
├── build/                      # Build tooling
│   ├── build.ts                # Orchestrates content + background builds
│   ├── env.ts                  # Environment variables
│   ├── plugins/                # Vite plugins (make-manifest)
│   ├── hmr/                    # Hot module reload (dev)
│   ├── dev-utils/              # Manifest parser
│   └── zipper/                 # Extension packaging
├── public/                     # Static assets (icons, armor images)
├── manifest.js                 # Chrome MV3 manifest definition
├── vite.config.ts              # Side panel Vite config
├── tsconfig.json               # TypeScript config (@app/* alias)
├── tailwind.config.ts          # Tailwind CSS config
└── eslint.config.ts            # ESLint config
```

## Data Flow

```
[Syrnia Game Page]
       |
       v
[Content Scripts]  -- chrome.runtime.sendMessage() -->  [Background Worker]
  (all.iife.js)                                          (background.js)
  (stats.iife.js)                                             |
                                                              v
                                                    [Chrome Storage API]
                                                         (local storage)
                                                              |
                                                              v
                                                    [Side Panel React App]
                                                      (React Query hooks)
```

### Content Scripts

- **`matches/all/`** - Runs on all pages. Scrapes screen data (current action, exp gains, loot) via `scrapeScreenData.ts` and sends to background worker via `sendData.ts`.
- **`matches/stats/`** - Runs on the Syrnia stats page. Scrapes detailed user stats via `scrapeUserStats.ts`.

### Background Worker

- **`background/index.ts`** - Listens for messages from content scripts, processes data, and stores it in Chrome storage using CSV-based tracking (`csv-tracker.ts`, `csv-storage.ts`).

### Side Panel

- React 19 app with React Query for data caching
- Views are tab-based, switched via Header component
- Each view has a co-located `use*.ts` hook for business logic

## Key Patterns

### Presentational Components + Hook Logic

All business logic lives in hooks. Components only render:

```typescript
// useDashboard.ts - all logic here
export const useDashboard = () => {
  const { allData } = useTrackedDataQuery();
  // ... calculations, formatting, memoization
  return { stats, chartData, ... };
};

// index.tsx - pure presentation
const Dashboard = memo(() => {
  const { stats, chartData } = useDashboard();
  return <Card>...</Card>;
});
```

### React Query for Data

All data access goes through React Query hooks in `app/hooks/`:
- `useTrackedDataQuery` - CSV-tracked hourly EXP data
- `useUserStatsQuery` - Player profile stats from stats page
- `useWeeklyStatsQuery` - Weekly aggregated statistics
- `useItemValuesQuery` - Item value data

### Chrome Storage Abstraction

`app/utils/storage/` provides a typed wrapper around `chrome.storage`:

```typescript
const storage = createStorage<MyType>('key', defaultValue, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});
```

- `createStorage<T>()` - Creates typed storage with get/set/subscribe
- Supports Local, Session, and Sync storage areas
- Live updates via `chrome.storage.onChanged` listener

### Import Alias

Single path alias: `@app/*` maps to `app/*`

```typescript
import { useStorage } from '@app/hooks';
import { Card, Button } from '@app/components';
import { cn } from '@app/utils/cn';
import type { CSVRow } from '@app/types';
```

## Build System

Three separate Vite builds:

1. **Content scripts** (IIFE) - Each `app/content/matches/*/index.ts` builds to `dist/content/*.iife.js`
2. **Background** (ES module library) - `app/background/index.ts` builds to `dist/background.js`
3. **Side panel** (standard HTML app) - `app/panel/` builds to `dist/side-panel/`

Build orchestration: `tsx build/build.ts` runs builds 1+2, then `vite build` runs build 3.

## Adding New Features

### New Side Panel View

1. Create component in `app/panel/components/NewFeature/`
2. Add `useNewFeature.ts` hook with all logic
3. Add `index.tsx` as presentational component
4. Register tab in `app/panel/constants/Tabs.ts`
5. Add case to `SidePanel.tsx` render switch

### New Shared Hook

Add to `app/hooks/` and export from `app/hooks/index.ts`.

### New Shared Component

Add to `app/components/` (or `app/components/ui/` for primitives) and export from barrel.

## Conventions

- Functional components with `memo()`
- Arrow functions enforced (`func-style`)
- `const` over `let`, no `var`
- `import type {}` for type-only imports
- Barrel `index.ts` in each directory
- Parameterless `catch {}` (no `_error`)
- Strict import ordering (auto-fixable)
