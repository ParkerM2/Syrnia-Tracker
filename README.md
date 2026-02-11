<div align="center">

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/a5dbf71c-c509-4c4f-80f4-be88a1943a0a" />
    <img alt="Logo" src="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
</picture>

![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)


</div>

## Table of Contents

- [What is Syrnia Tracker?](#what-is-syrnia-tracker)
- [How It Works](#how-it-works)
  - [Data Collection Process](#data-collection-process)
  - [Data Storage](#data-storage)
  - [Side Panel Interface](#side-panel-interface)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Scripts](#scripts)

## What is Syrnia Tracker?

**Syrnia Tracker** is a Chrome extension designed to automatically track and analyze gameplay statistics for the online game [Syrnia](https://www.syrnia.com). The extension monitors your gameplay in real-time, collecting data about experience gains, combat statistics, loot drops, and more, then presents this information in an organized side panel interface.

### Key Features

- **Real-time Data Tracking**: Automatically scrapes game data as you play, including:
  - Experience gains by skill
  - Combat statistics (damage dealt/received, max/average hits)
  - Loot drops with item values and profit calculations
  - HP usage
  - Location and monster name
  - Equipment stats (armor, aim, power, travel time) For future implementation of estimated combat calculator (made by Foo)

- **Historical Data Analysis**: View your tracked data filtered by:
  - Hour
  - Day
  - Week
  - Month

- **Comprehensive Statistics**: 
  - Total experience gained per skill
  - Performance metrics by location
  - Loot value tracking with customizable item prices
  - Weekly statistics with automatic week calculation (starts Sunday 6 PM EST)

- **Data Export**: Download all tracked data as CSV files for external analysis

- **User Profile Integration**: Automatically scrapes and displays your character profile from the stats page (only is grabbing the the levels, progress, and current / weekly gains). 
   - This requires opening the syrnia stats page
   - future updates might allow for exchange of this method to use syrnia API

## How It Works

### Data Collection Process

The extension uses a multi-step process to detect game values and save them for tracking:

#### Step 1: Page Monitoring
When you navigate to Syrnia game pages, the extension begins monitoring the page for specific values to appear:

- **On Fight end (e.g., "You defeated ")**: The extension watches for:
  - Experience gain messages (e.g., "You got 27 strength experience")
  - Skill changes and level up notifications
  - Combat fight log updates
  - Location and monster name changes
  - Inventory and HP value changes

- **On Stats Page**: When you visit the stats page, the extension looks for:
  - Your username (only for Displaying in the side-panel ui)
  - Skill level values
  - Total experience values for each skill
  - Experience to next level values
  - Weekly and hourly experience gain values
  These are saved and used as a fallback for non-tracked exp (every skill but combat at the moment)
 

#### Step 2: Text Scraping and Saving

Currently The scrape happens when the [Fight Ended] is detected, wich is being observed via querySelector for the html element the "You defeated " text appears in. If that text appears in the corresponding htmlElement, the scrape of the fight log happens.

**Game Screen Values**:
- Looks for experience text patterns (e.g., "You got 27 strength experience") and extracts the skill name and amount
- Watches fight logs for combat experience
- which skill is currently being trained
- damage values when they appear in fight logs (damage dealt and received)
- loot drop text and amounts when they appear
- Food consumed text to discern HP used value
- Fighting Location and Monster Name
- Grabs equipment stat values (armor, aim, power, travel time) Useful for Foo's calc, and csv data for analysis on fighting locations, aim vs power topics, and eventually travel time for speed routes. 

**Stats Page Values**:
- Extracts username and timestamp's when the page loads
- Reads only skill information values including:
  - Current level numbers
  - Total experience values
  - Experience to next level values
  - Experience gained this hour values
  - Experience gained this week values
  - Levels gained this week counts
** Likely to be converted to use either Syrnia API, or via helpsite made by Swoosh/Akkarin **

#### Step 3: Data Transmission
When new values are detected that differ from previously saved values, the extension sends them for processing:

- Sends `UPDATE_SCREEN_DATA` messages containing the detected values
- Only sends data when values have actually changed to avoid duplicates
- Handles cases where the extension context may be invalidated

#### Step 4: Value Processing and Storage
The background service receives the detected values and processes them for storage:

- **Screen Data Processing**:
  - Converts the detected values to CSV format ** To be updated to JSON for convience **
  - Calculates experience gains by comparing new values with previously saved values
  - Saves new rows containing the detected values to tracked data storage
  - Sends the values to the side panel for immediate display
  - new Rows are always Timestamped in UTC format

- **User Stats Processing**:
  - Saves the detected profile values to separate storage
  - Updates weekly statistics using the detected weekly gain values (catches gains not tracked by extension)
  - Maintains separate tracking for screen-detected values vs. stats page values (prevents duplicated or bad data)


#### Step 5: Data Storage
All data is stored in Chrome's local storage in CSV format:
(updating to use JSON, with side-panel table view of storage with filter/sort/export options)
- **`tracked_data_csv`**: screen-scraped data with timestamps
- **`user_stats_csv`**: data from stats page
- **`weekly_stats_csv`**: Aggregated weekly statistics
- **`item_values`**: Custom item prices for loot value calculations
- **`last_exp_by_skill`**: Last known experience values for gain calculations

Data persists across browser sessions and can be exported as CSV files.
Data also available to be accessed via other syrnia help-sites, can provide them with info.
Site being made my Swooshy/Akka/Foo/Ruto will have dashboard, tables, etc to view the data and save it to our API, allowing the user to clear the extension storage regularly if needed.

### Data Storage

The extension uses Chrome's `chrome.storage.local` API to store all data in CSV format. This approach provides:

- **Persistence**: Data survives browser restarts
- **Efficiency**: CSV format is compact and easy to parse
- **Exportability**: Data can be easily exported and analyzed externally
- **Version Control**: Simple format makes data migration easier

### Side Panel Interface

The side panel is the main interface for viewing and interacting with your tracked data. It consists of five main tabs:

#### Dashboard Tab

The Dashboard provides an overview of your current gameplay session:

![Dashboard Tab](https://i.gyazo.com/1954837345d92f0455a06d6971bf23d3.png)

**Current Hour Statistics**:
- Total experience gained in the current hour
- Experience breakdown by skill
- Current skill being trained (highlighted)
- Skill levels and experience to next level

**Previous Hour Comparison**:
- Experience gained in the previous hour
- Side-by-side comparison with current hour

**Experience Chart**: (Currently not in-use... provided much headache lol)
- Interactive chart showing experience gains over time
- Filterable by skill and time frame (hour, day, week, month)
- Multiple chart types: Area, Bar, Line, Pie, Radar, Radial

**Drops Summary**: (plans to update this to be more robust with filter/sort options)
- Total drops received in current hour
- Drop counts and values
- HP used during combat

**Performance Metrics**:
- Average and maximum damage dealt
- Average and maximum damage received
- Total fights completed
(stored data will have each hit per fight for useful analysis)

#### Profile Tab

The Profile tab displays your character information and current training progress:

![Profile Tab](https://i.gyazo.com/28e6ed73a768687abd0a763dfd639b57.png)

**Profile Card**:
- Username and last update timestamp
- Button to open the stats page in a new tab (this only is a href to the expected URL, does NOT interact or pass a click function to the DOM)
- Overall Level summary

**Current Hour Skill Cards**:
- Cards for each skill with experience gained in the current hour

**All Skills Display**:
- Complete list of all skills with their current levels
- Total experience, experience to next level
- Experience gained this hour and this week
- Levels gained this week
- Progress bars for each skill

#### Performance Tab (Stats)

The Performance tab shows detailed statistics organized by location:

![Performance Tab](SCREENSHOT_URL_PERFORMANCE)

**Location Filtering**:
- Tabs for each location where you've trained
- "All" tab showing combined statistics from all locations
- Automatically groups data by location name

**Location Statistics**:
- Total experience gained at each location
- Experience breakdown by skill per location
- Total fights completed
- Average and maximum damage dealt
- Average and maximum damage received

**Performance Table**:
- Detailed table showing all combat statistics
- Columns for damage dealt, damage received, HP used
- Sortable and filterable data
- Expandable rows for detailed information

**Data Management**:
- Clear data for current hour
- Export location-specific data

#### Loot Tab

The Loot tab tracks all items dropped during gameplay:

![Loot Tab](SCREENSHOT_URL_LOOT)

**Current Hour Drops**:
- All items dropped in the current hour
- Item images with quantity badges
- Individual item values and total value
- Total profit calculation

**Drop Statistics**:
- Total count of each item type
- Cumulative amounts across all drops
- Total value of all drops
- Profit calculations (if item values are set)

**Item Value Management**:
- Settings dialog to set custom GP values for items
- Values are saved and used for profit calculations
- Supports all game items

**Historical Loot Tracking**:
- View drops from previous hours
- Filter by time period
- Export loot data

#### History Tab

The History tab provides comprehensive historical data analysis:

![History Tab](https://i.gyazo.com/2ba212467883e6fd1fa9b280fc52551e.png)

**Time Period Selection**:
- Filter by Hour, Day, Week, or Month
- Automatic period calculation (weeks start Sunday 6 PM EST)

**Period Breakdown Table**:
- Summary statistics for each period
- Total experience gained per period
- Experience breakdown by skill
- Total fights, drops, and HP used
- Expandable rows for detailed period information

**Detailed Entry View**:
- Click any period row to expand details
- See all entries within that period
- Experience gains, drops, combat stats per entry
- Timestamp and location information

**Data Export**:
- Export all tracked data as CSV
- Export specific time periods
- Download button with loading states

**Data Management**:
- Clear all tracked data
- Clear specific time periods
- Refresh data manually

### Technical Architecture

The extension follows a clear separation of concerns:

- **Content Scripts**: Handle data scraping
- **Background Service Worker**: Processes and stores data
- **Side Panel (React)**: Displays data using TanStack Query for state management
- **Shared Packages**: Reusable utilities, hooks, and components

Data flows unidirectionally:
```
Game Page → Data Scraper → Background Worker → Storage → Cache → Side Panel
```

## Tech Stack

- **React 19** + **TypeScript** — Side panel UI
- **Tailwind CSS** — Styling with custom theme support
- **Vite** — Build tooling (three separate builds: content scripts, background worker, side panel)
- **TanStack Query** — Data fetching and cache management
- **Recharts** — Charts and data visualization
- **Chrome Manifest V3** — Extension APIs (`chrome.storage.local`, `chrome.sidePanel`, `chrome.runtime`)

## Project Structure

```
app/
  background/       # Chrome service worker — receives and stores data
  content/          # Content modules — reads visible page values
    matches/        # Entry points per match pattern (all/, stats/)
  panel/            # React side panel UI
    components/     # Page components (Dashboard, Profile, Calendar, etc.)
  components/       # Shared UI components (Radix primitives)
  hooks/            # Shared React hooks
  utils/            # Utilities and Chrome storage abstraction
  types/            # Shared TypeScript types
build/              # Build tooling (build.ts, plugins, HMR)
```

## Installation

1. Clone the repository
2. Ensure Node.js >= 22.15.1 and install pnpm: `npm install -g pnpm`
3. Run `pnpm install`
4. Run `pnpm build` (or `pnpm dev` for development with HMR)
5. Open `chrome://extensions`, enable **Developer mode**
6. Click **Load unpacked** and select the `dist` directory

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Production build |
| `pnpm dev` | Dev build with hot reload |
| `pnpm lint` | ESLint check |
| `pnpm format` | Prettier format |
| `pnpm type-check` | TypeScript type checking |
| `pnpm zip` | Package `dist/` into a `.zip` for Chrome Web Store |

