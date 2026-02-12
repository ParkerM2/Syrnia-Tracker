# CSV Tracking Feature

This extension now includes a comprehensive CSV tracking system that saves all scraped screen data locally and allows you to view historical data by hour, day, week, and month.

## Features

1. **Automatic Data Saving**: All scraped `ScreenData` is automatically saved to Chrome's local storage in CSV format
2. **Time-Based Filtering**: View tracked data filtered by:
   - Hour
   - Day
   - Week
   - Month
3. **Statistics**: See aggregated statistics including:
   - Total entries
   - Total experience gained
   - Experience by skill
4. **CSV Export**: Download your tracked data as a CSV file
5. **Data Management**: Clear all tracked data when needed

## How It Works

### Data Flow

1. Content script (`pages/content/src/scrapeScreenData.ts`) scrapes screen data
2. Data is sent to background script via `UPDATE_SCREEN_DATA` message
3. Background script (`chrome-extension/src/background/index.ts`) automatically saves data to CSV storage
4. Side panel can access and display the tracked data

### Storage

- Data is stored in Chrome's `local` storage under the key `tracked_data_csv`
- CSV format: `timestamp,skill,exp,speedText,addExp,images,links`
- Data persists across browser sessions

### Usage in Side Panel

The `TrackedHistory` component is available in the side panel. To access it:

1. Navigate to the "HISTORY" tab in the side panel
2. Select a time period (hour, day, week, month)
3. View statistics and recent entries
4. Download CSV or clear data as needed

### Programmatic Usage

#### Using the Hook

```typescript
import { useTrackedData } from '@extension/shared';

const MyComponent = () => {
  const {
    allData,
    dataByPeriod,
    stats,
    statsByPeriod,
    refresh,
    download,
    clear,
    loading,
  } = useTrackedData();

  // Get data for last 24 hours
  const dayData = dataByPeriod('day');
  const dayStats = statsByPeriod('day');

  return (
    <div>
      <p>Total entries: {stats.totalEntries}</p>
      <p>Total exp: {stats.totalExp}</p>
      <button onClick={download}>Download CSV</button>
    </div>
  );
};
```

#### Direct API Usage

```typescript
import {
  appendToCSV,
  getCSVRows,
  downloadCSV,
  clearCSVData,
  filterByTimePeriod,
  aggregateStats,
} from '@extension/shared';

// Append new data (usually done automatically by background script)
await appendToCSV(screenData);

// Get all rows
const rows = await getCSVRows();

// Filter by time period
const dayData = filterByTimePeriod(rows, 'day');

// Get statistics
const stats = aggregateStats(dayData);

// Download CSV file
await downloadCSV();

// Clear all data
await clearCSVData();
```

## CSV File Format

The CSV file has the following structure:

```csv
timestamp,skill,exp,speedText,addExp,images,links
2024-01-15T10:30:00.000Z,Attack,1500,,,,
2024-01-15T10:31:00.000Z,Defence,2000,,,,
```

Fields:
- `timestamp`: ISO 8601 timestamp
- `skill`: Skill name (e.g., "Attack", "Defence")
- `exp`: Experience value as string
- `speedText`: Speed text (if available)
- `addExp`: Additional experience (if available)
- `images`: Semicolon-separated image URLs
- `links`: Semicolon-separated link URLs

## Permissions

The extension requires the `downloads` permission to save CSV files. This is already added to the manifest.

## Files Created/Modified

### New Files
- `packages/shared/lib/utils/csv-tracker.ts` - CSV parsing and filtering utilities
- `packages/shared/lib/utils/csv-storage.ts` - Storage and download functions
- `packages/shared/lib/hooks/useTrackedData.ts` - React hook for accessing tracked data
- `pages/side-panel/src/components/TrackedHistory/index.tsx` - UI component for viewing tracked data

### Modified Files
- `chrome-extension/manifest.ts` - Added `downloads` permission
- `chrome-extension/src/background/index.ts` - Added CSV saving on data receive
- `packages/shared/lib/utils/index.ts` - Exported CSV utilities
- `packages/shared/lib/hooks/index.ts` - Exported `useTrackedData` hook
- `pages/side-panel/src/SidePanel.tsx` - Added TrackedHistory component
- `pages/side-panel/src/constants/Tabs/index.js` - Added HISTORY tab

## Notes

- CSV data is stored in Chrome's local storage, which has size limits (~10MB)
- For very large datasets, consider periodically downloading and clearing old data
- The CSV file is saved to the default Downloads folder when using the download function
- All timestamps are stored in ISO 8601 format (UTC)
