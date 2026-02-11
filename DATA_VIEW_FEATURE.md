# Data View Feature

## Overview
The Data View feature provides a comprehensive interface to view all tracked data in your Chrome extension. It includes filtering capabilities and multiple view modes.

## Location
Access the Data View through the **Settings dropdown** in the header navigation.

### Desktop (>700px width)
- Click the "Settings" badge in the main header
- Select "Data View" from the dropdown menu

### Mobile (<700px width)
- Click the gear icon (⚙️) on the right side of the header
- Select "Data View" from the menu

## Features

### 1. Data Display Modes
- **Table View** (default): Mobile-responsive table showing key data fields
- **JSON View**: Raw JSON format for all data records

Toggle between modes using the switch in the Data View settings card.

### 2. Filters
Three filter options are available:

- **All Data**: Shows all tracked records
- **Loot Only**: Shows only records with item drops from monsters
- **Exp Gains Only**: Shows only records with experience gains (gainedExp > 0)

### 3. Table Columns
The table view displays:
- Timestamp (formatted for readability)
- Skill name
- Skill level
- Gained experience
- Drops (truncated for mobile, hover for full text)
- Monster name
- Location
- HP (current/total)

### 4. Data Sorting
All data is automatically sorted by timestamp in descending order (most recent first).

### 5. Real-time Updates
The data refreshes every 5 seconds automatically to show the latest tracked information.

## Technical Details

### Files Added
1. `pages/side-panel/src/components/DataView/index.tsx` - Main component
2. `pages/side-panel/src/components/DataView/useDataView.ts` - Data fetching and filtering logic
3. `pages/side-panel/src/constants/Tabs/index.js` - Added DATA_VIEW constant

### Files Modified
1. `pages/side-panel/src/components/Header/index.tsx` - Added Data View to settings dropdown
2. `pages/side-panel/src/SidePanel.tsx` - Added Data View rendering

### Data Source
The component uses the CSV storage system (`getCSVRows` from `@extension/shared`) to fetch all tracked data, which includes:
- Screen scraping data
- Combat experience gains
- Loot drops
- Monster encounters
- Equipment data
- Fight statistics

### Mobile Responsiveness
- Table is horizontally scrollable on small screens
- Minimum column widths prevent text overlap
- Truncated text with hover tooltips for long content
- Responsive filter badges that wrap on small screens

## Usage Tips

1. **Viewing Recent Activity**: The default view shows all data sorted by most recent first
2. **Finding Specific Loot**: Use the "Loot Only" filter to see what items have been dropped
3. **Tracking Exp Progress**: Use the "Exp Gains Only" filter to see only skill improvements
4. **Exporting Data**: Switch to JSON view and copy the data for external analysis
5. **Performance**: The table is optimized for mobile devices and handles large datasets efficiently
