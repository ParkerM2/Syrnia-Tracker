# Side Panel Components

This directory contains the React components for the Chrome Extension side panel.

## Structure

```
side-panel/
├── src/
│   ├── components/          # Feature components
│   │   ├── Dashboard/      # Overview dashboard
│   │   ├── Stats/          # Experience statistics
│   │   ├── LootMap/        # Loot tracking
│   │   ├── TrackedHistory/ # Historical data
│   │   └── Header/         # Navigation header
│   ├── constants/          # Constants and configuration
│   │   ├── Tabs/          # Tab navigation constants
│   │   └── FightingLocations/ # Game location data
│   ├── SidePanel.tsx       # Main component
│   └── index.tsx          # Entry point
└── package.json
```

## Components

### Dashboard

**Purpose**: Overview of current and previous hour statistics

**Features**:
- Current hour experience gains
- Previous hour comparison
- Expandable cards for detailed breakdown
- Skills, drops, HP, and average hit statistics

**Hooks Used**:
- `useHourlyExp` - Current hour tracking
- `useTrackedData` - Data access
- `useHourStats` - Hour statistics calculation
- `useFormatting` - Formatting utilities

### Stats

**Purpose**: Detailed experience tracking per skill

**Features**:
- Current hour experience per skill
- Skill level and exp for next level
- Average hit by location
- Expandable skill cards
- Clear hour data functionality

**Hooks Used**:
- `useHourlyExp` - Current hour
- `useTrackedData` - Data access
- `useScreenData` - Real-time screen data
- `useFormatting` - Formatting utilities

### LootMap

**Purpose**: Track and display loot/drops

**Features**:
- Drop statistics for current hour
- HP usage tracking
- Drop count and totals
- Time-stamped drop history

**Hooks Used**:
- `useHourlyExp` - Current hour
- `useTrackedData` - Data access
- `useFormatting` - Formatting utilities

### TrackedHistory

**Purpose**: Historical data with time period filtering

**Features**:
- Filter by hour/day/week/month
- Period breakdown tables
- Expandable period details
- Download CSV functionality
- Clear all data option

**Hooks Used**:
- `useTrackedData` - Data access and filtering
- `useFormatting` - Formatting utilities

### Header

**Purpose**: Navigation and tab switching

**Features**:
- Tab navigation
- Header title
- Tab state management

## Adding a New Component

1. Create component directory:
   ```bash
   mkdir pages/side-panel/src/components/NewComponent
   ```

2. Create component file:
   ```typescript
   // pages/side-panel/src/components/NewComponent/index.tsx
   import { memo } from 'react';
   import { useTrackedData, useFormatting } from '@extension/shared';
   import { Card } from '@extension/ui';

   const NewComponent = memo(() => {
     const { allData } = useTrackedData();
     const { formatExp } = useFormatting();
     
     return <Card>...</Card>;
   });

   NewComponent.displayName = 'NewComponent';
   export default NewComponent;
   ```

3. Add to SidePanel.tsx:
   ```typescript
   import NewComponent from './components/NewComponent';
   
   const renderComponent = (screen: String) => {
     switch (screen) {
       case DISPLAY.NEW_COMPONENT:
         return <NewComponent />;
       // ...
     }
   };
   ```

4. Add tab constant:
   ```typescript
   // pages/side-panel/src/constants/Tabs/index.js
   export default {
     // ...
     NEW_COMPONENT: 'new-component',
   };
   ```

5. Update Header component to include new tab

## Component Guidelines

1. **Use memo()** for performance
2. **Extract logic to hooks** when reusable
3. **Use shared formatting utilities** from `@extension/shared`
4. **Type all props and state**
5. **Handle loading and error states**
6. **Keep components focused** - one responsibility

## State Management

- **Local state**: `useState` for component-specific state
- **Shared state**: Custom hooks in `packages/shared/lib/hooks`
- **Persistent state**: Chrome storage via `useTrackedData`, `useStorage`

## Styling

- **Tailwind CSS** for styling
- **shadcn/ui components** from `@extension/ui`
- **Dark mode** support via theme toggle

## Performance

- Components are memoized to prevent unnecessary re-renders
- Expensive calculations use `useMemo`
- Data hooks handle caching and updates efficiently
