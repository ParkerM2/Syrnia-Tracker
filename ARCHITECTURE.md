# Architecture Documentation

This document outlines the architecture, patterns, and structure of the Chrome Extension codebase.

## Overview

This extension is a **Side-Panel only** Chrome extension that tracks game statistics, experience gains, and loot data. The codebase follows **MVP (Model-View-Presenter)** patterns with clear separation of concerns.

## Project Structure

```
Chrome-Ext/
├── chrome-extension/          # Extension manifest and build config
│   ├── manifest.ts           # Extension manifest (side-panel only)
│   └── src/
│       └── background/       # Background service worker
├── pages/
│   ├── content/              # Content scripts (data scraping)
│   └── side-panel/          # Main UI (React components)
│       └── src/
│           ├── components/  # React components
│           ├── constants/   # Constants and configuration
│           └── SidePanel.tsx # Main entry point
└── packages/
    ├── shared/              # Shared utilities and hooks
    │   └── lib/
    │       ├── hooks/       # Reusable React hooks
    │       └── utils/       # Utility functions
    └── ui/                  # UI component library
```

## Architecture Patterns

### MVP (Model-View-Presenter) Pattern

Components follow the MVP pattern for clear separation:

- **Model**: Data layer (hooks, storage, data fetching)
- **View**: Presentation layer (React components, UI)
- **Presenter**: Business logic layer (custom hooks, data transformation)

#### Example Structure

```
Component/
├── index.tsx          # View (presentation only)
├── hooks/            # Presenter (business logic)
│   └── useComponentLogic.ts
└── types.ts          # Model (data types)
```

### Component Guidelines

1. **Components should be presentational** - minimal logic, focused on rendering
2. **Business logic in hooks** - extract complex logic to custom hooks
3. **Shared utilities** - common functions in `packages/shared/lib/utils`
4. **Type safety** - use TypeScript types for all data structures

## Key Packages

### `@extension/shared`

Shared utilities and hooks used across the extension.

#### Hooks

- **`useHourlyExp`**: Tracks experience gains for the current hour
- **`useTrackedData`**: Manages CSV-tracked data with filtering and aggregation
- **`useScreenData`**: Receives real-time screen data from content scripts
- **`useFormatting`**: Provides formatting utilities (exp, time, drops)
- **`useHourStats`**: Calculates statistics for a specific hour

#### Utilities

- **`formatting.ts`**: Formatting functions (formatExp, formatTime, parseDrops, parseDropAmount)
- **`csv-tracker.ts`**: CSV data tracking and aggregation
- **`csv-storage.ts`**: Chrome storage operations for CSV data

### `@extension/ui`

UI component library with shadcn/ui components.

## Component Structure

### Side Panel Components

Located in `pages/side-panel/src/components/`:

1. **Dashboard** - Overview of current and previous hour stats
2. **Stats** - Detailed experience tracking per skill
3. **LootMap** - Loot and drop tracking
4. **TrackedHistory** - Historical data with time period filtering
5. **Header** - Navigation and tab switching

### Component Pattern

Each component should:

```typescript
// 1. Import hooks and utilities
import { useHourlyExp, useTrackedData, useFormatting } from '@extension/shared';
import { Card, CardContent } from '@extension/ui';

// 2. Use custom hooks for business logic
const MyComponent = memo(() => {
  const { formatExp } = useFormatting();
  const hourlyExp = useHourlyExp();
  
  // 3. Minimal component logic
  // 4. Return JSX
});
```

## Data Flow

```
Content Script (pages/content)
    ↓ (scrapes game data)
Background Script (chrome-extension/src/background)
    ↓ (processes and stores)
Chrome Storage (local)
    ↓ (hooks read from storage)
Side Panel Components
    ↓ (display data)
User Interface
```

## Adding New Features

### 1. Create a New Component

```typescript
// pages/side-panel/src/components/NewFeature/index.tsx
import { useTrackedData, useFormatting } from '@extension/shared';
import { Card } from '@extension/ui';

export const NewFeature = memo(() => {
  const { allData } = useTrackedData();
  const { formatExp } = useFormatting();
  
  return <Card>...</Card>;
});
```

### 2. Add to Side Panel

```typescript
// pages/side-panel/src/SidePanel.tsx
import NewFeature from './components/NewFeature';

const renderComponent = (screen: String) => {
  switch (screen) {
    case DISPLAY.NEW_FEATURE:
      return <NewFeature />;
    // ...
  }
};
```

### 3. Create Reusable Hooks

If logic is reusable, create a hook in `packages/shared/lib/hooks/`:

```typescript
// packages/shared/lib/hooks/useNewFeature.ts
export const useNewFeature = () => {
  // Business logic here
  return { /* data */ };
};
```

## Best Practices

1. **Separation of Concerns**
   - View: Only rendering logic
   - Presenter: Business logic in hooks
   - Model: Data types and storage

2. **Reusability**
   - Extract common logic to hooks
   - Use shared utilities for formatting
   - Create reusable UI components

3. **Type Safety**
   - Define types for all data structures
   - Use TypeScript strictly
   - Export types from shared package

4. **Performance**
   - Use `memo()` for components
   - Use `useMemo()` for expensive calculations
   - Avoid unnecessary re-renders

5. **Error Handling**
   - Use try-catch for async operations
   - Provide user-friendly error messages
   - Log errors appropriately

## File Naming Conventions

- **Components**: PascalCase (`Dashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useHourStats.ts`)
- **Utilities**: camelCase (`formatting.ts`)
- **Types**: camelCase with `.ts` extension (`types.ts`)
- **Constants**: UPPER_SNAKE_CASE (`DISPLAY.ts`)

## Extension Manifest

The extension only includes:
- **Side Panel**: Main UI interface
- **Content Scripts**: Data scraping from game pages
- **Background Script**: Data processing and storage

**Removed Features** (not part of this extension):
- New Tab override
- Popup
- Options page
- DevTools

## Testing Considerations

When adding new features:
1. Test with real game data
2. Verify data persistence across sessions
3. Check performance with large datasets
4. Ensure proper error handling

## Code Review Checklist

For game developer review:
- ✅ Clean, readable code
- ✅ Clear separation of concerns
- ✅ Proper TypeScript types
- ✅ No hardcoded values
- ✅ Proper error handling
- ✅ Performance considerations
- ✅ Documentation for complex logic
