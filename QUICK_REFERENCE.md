# Quick Reference Guide

## For Users

### How to Use the Extension

#### 1. Getting Started
1. Install the extension in your browser
2. Navigate to the game (Syrnia)
3. Open the side panel (right-click extension icon, select "Open side panel")

#### 2. Viewing Your Stats
**Option A: Visit Stats Page**
- Go to `https://www.syrnia.com/theGame/includes2/stats.php`
- Extension automatically scrapes your stats
- Close the tab when done (data is saved)

**Option B: Use Side Panel**
- Open side panel
- Click "Open Player Stats" button in Profile Card
- Stats will be displayed after page loads

#### 3. Viewing Dashboard
- Open side panel → Dashboard tab
- See current hour and previous hour exp gains
- View drops, HP used, and average hit
- See all tracked skills with levels and exp

#### 4. Exporting Your Data
**Export All Data:**
- Dashboard tab → Click "Export All Data" button
- Choose save location
- Three CSV files will be downloaded

**Export Specific Data:**
- History tab → Click download icon
- Exports tracked data only

#### 5. Viewing History
- Open side panel → History tab
- Select time period (Hour, Day, Week, Month)
- Click on any row to expand details
- See exp by skill, drops, HP used

#### 6. Clearing Data
**Clear All Data:**
- History tab → Click trash icon
- Confirm deletion

**Clear Current Hour:**
- Stats tab → Click "Clear Hour" button
- Confirms deletion

---

## For Developers

### Using the Storage Service

```typescript
import {
  getTrackedData,
  appendTrackedData,
  getUserStats,
  saveUserStats,
  getWeeklyStats,
  saveWeeklyStats,
  downloadTrackedDataCSV,
  downloadUserStatsCSV,
  downloadWeeklyStatsCSV,
  downloadAllDataCSV,
} from '@extension/shared';

// Get tracked data
const rows = await getTrackedData();

// Append tracked data
await appendTrackedData([newRow]);

// Get user stats
const stats = await getUserStats();

// Save user stats
await saveUserStats(statsData);

// Get weekly stats
const weeklyStats = await getWeeklyStats();

// Export data
await downloadAllDataCSV(true); // true = show file picker
```

### Using TanStack Query Hooks

```typescript
import {
  useTrackedDataQuery,
  useUserStatsQuery,
  useWeeklyStatsQuery,
  useDataExport,
} from '@extension/shared';

// Tracked data hook
const {
  allData,           // All CSV rows
  dataByPeriod,      // Filter by time period
  dataByHour,        // Filter by hour
  dataByDay,         // Filter by day
  stats,             // Aggregated stats
  statsByPeriod,     // Stats for period
  refresh,           // Manual refresh
  download,          // Download CSV
  clear,             // Clear all data
  clearByHour,       // Clear by hour
  loading,           // Initial loading state
  isFetching,        // Background fetching
  error,             // Error state
} = useTrackedDataQuery();

// User stats hook
const {
  userStats,         // User stats object
  loading,           // Loading state
  isFetching,        // Background fetching
  error,             // Error state
  refresh,           // Manual refresh
} = useUserStatsQuery();

// Weekly stats hook
const {
  weeklyStats,       // All weekly stats
  currentWeekStats,  // Current week only
  loading,           // Loading state
  isFetching,        // Background fetching
  error,             // Error state
  refresh,           // Manual refresh
} = useWeeklyStatsQuery();

// Data export hook
const {
  exportData,        // Export function
  isExporting,       // Loading state
  error,             // Error state
} = useDataExport();

// Export examples
await exportData('tracked', true);    // Tracked data
await exportData('userStats', true);  // User stats
await exportData('weeklyStats', true);// Weekly stats
await exportData('all', true);        // All data
```

### Creating New Components

```typescript
import { useTrackedDataQuery, useFormatting } from '@extension/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@extension/ui';
import { memo, useMemo } from 'react';

const MyComponent = memo(() => {
  const { allData, loading } = useTrackedDataQuery();
  const { formatExp } = useFormatting();

  // Memoize expensive calculations
  const totalExp = useMemo(() => {
    return allData.reduce((sum, row) => {
      return sum + (parseInt(row.gainedExp || '0', 10) || 0);
    }, 0);
  }, [allData]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Exp</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{formatExp(totalExp)}</p>
      </CardContent>
    </Card>
  );
});

MyComponent.displayName = 'MyComponent';

export default MyComponent;
```

### Adding New Storage Operations

```typescript
// In storage-service.ts

/**
 * Get custom data from storage
 */
export async function getCustomData(): Promise<CustomData[]> {
  const csvContent = await getFromStorage('custom_data_csv', getCustomDataHeader());
  return parseCustomDataCSV(csvContent);
}

/**
 * Save custom data to storage
 */
export async function saveCustomData(data: CustomData[]): Promise<void> {
  const header = getCustomDataHeader();
  const lines = data.map(customDataToString);
  const csvContent = `${header}\n${lines.join('\n')}`;
  await setInStorage('custom_data_csv', csvContent);
}

/**
 * Download custom data as CSV
 */
export async function downloadCustomDataCSV(saveAs: boolean = true): Promise<void> {
  const csvContent = await getFromStorage('custom_data_csv', getCustomDataHeader());
  const date = new Date().toISOString().split('T')[0];
  await downloadCSV(csvContent, `custom_data_${date}.csv`, saveAs);
}
```

### Creating New Hooks

```typescript
// useCustomDataQuery.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getCustomData } from '../utils/storage-service.js';

export const CUSTOM_DATA_QUERY_KEY = ['customData'] as const;

export const useCustomDataQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: customData = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: CUSTOM_DATA_QUERY_KEY,
    queryFn: async () => {
      return await getCustomData();
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Listen for storage changes
  useEffect(() => {
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.custom_data_csv) {
        queryClient.invalidateQueries({ queryKey: CUSTOM_DATA_QUERY_KEY });
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: CUSTOM_DATA_QUERY_KEY });
    await queryClient.refetchQueries({ queryKey: CUSTOM_DATA_QUERY_KEY });
  };

  return {
    customData,
    loading: isLoading,
    isFetching,
    error: error as Error | null,
    refresh,
  };
};
```

---

## Common Tasks

### Task: Add a new stat to track
1. Update `types.ts` with new field
2. Update scraping logic in content script
3. Update CSV format in `csv-tracker.ts`
4. Update storage service if needed
5. Update UI components to display new stat

### Task: Add a new time period filter
1. Update `TimePeriod` type in `csv-tracker.ts`
2. Add filter logic to `filterByTimePeriod()`
3. Update UI components to show new option

### Task: Add a new export format
1. Create new export function in `storage-service.ts`
2. Update `useDataExport` hook to support new format
3. Update UI to show new export option

### Task: Add a new chart type
1. Create new chart component in `ExpChart/charts/`
2. Add to chart type selector in `ExpChart/index.tsx`
3. Update chart data processing if needed

---

## Troubleshooting

### Data not updating in side panel
**Solution:**
1. Check if stats page was visited recently
2. Refresh side panel manually
3. Check browser console for errors

### CSV export not working
**Solution:**
1. Check browser permissions for downloads
2. Verify storage has data
3. Check browser console for errors

### Stats page not scraping
**Solution:**
1. Verify you're on the correct URL
2. Check if page loaded completely
3. Look for errors in browser console
4. Try refreshing the stats page

### Performance issues
**Solution:**
1. Clear old data from History tab
2. Check browser memory usage
3. Restart browser if needed

---

## Best Practices

### For Users
✅ Visit stats page regularly for accurate data
✅ Export data periodically as backup
✅ Clear old data to improve performance
✅ Keep browser updated

### For Developers
✅ Use storage service for all storage operations
✅ Use TanStack Query hooks for data access
✅ Memoize expensive calculations
✅ Follow separation of concerns
✅ Write clear comments
✅ Test changes thoroughly
✅ Update documentation

---

## Useful Links

- **Game:** https://www.syrnia.com
- **Stats Page:** https://www.syrnia.com/theGame/includes2/stats.php
- **TanStack Query Docs:** https://tanstack.com/query/latest
- **shadcn/ui Docs:** https://ui.shadcn.com

---

## Support

If you need help:
1. Check this guide first
2. Review the CHANGELOG.md
3. Check the code comments
4. Test in browser console
5. Report issues with details

---

**Last Updated:** January 2026
**Version:** 2.0.0 (Post-Refactor)
