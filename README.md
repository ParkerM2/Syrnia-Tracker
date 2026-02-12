> [!IMPORTANT] 
> **ONLY** for testing in the  **[PTR](www.ptr.syrnia.com) Environment** until further notice.

# Syrnia Tracker - Local Live Data Tracking and Analysis

<img width="800" alt="image" src="https://github.com/user-attachments/assets/a26d083b-c502-4af7-a1ba-f736ed707f92" />

## Table of Contents

- [What is Syrnia Tracker?](#what-is-syrnia-tracker)
- [How It Works](#how-it-works)
  - [Data Collection Process](#data-collection-process)
  - [Data Storage](#data-storage)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

## Views
<img width="200" alt="image" src="https://github.com/user-attachments/assets/251a739c-c3d4-4b08-94ec-f4a155004ed9" />
<img width="200" title="Month View" alt="Calendar Month View Image" src="https://github.com/user-attachments/assets/e5ccf6a2-e4db-4cf6-8297-e49c34464509" />
<img width="200" title="Day View" alt="Calendar Day view Image" src="https://github.com/user-attachments/assets/ee876226-4665-422d-ac26-692d8d7e0a83" />
<img width="200" title="Player Stats" alt="Player Stats view Image" src="https://github.com/user-attachments/assets/7226bb35-21d2-46b7-8039-912a9bcff76f" />
<img width="200" title="Combat Performance" alt="Combat Performance View" src="https://github.com/user-attachments/assets/b9fe8cc6-731a-48d6-b9bc-ecbe3d27e20b" />
<img width="200" title="Drops, Processed, or Gathered Items" alt="Loot/Gathered/Processed Items View" src="https://github.com/user-attachments/assets/43bb2d42-b1bd-437f-899c-f9d4113f4875" />
<img width="200" title="History Table for Analysis" alt="History Stats View" src="https://github.com/user-attachments/assets/223c7fdb-ee8f-4219-bab1-c497301937f3" />
<img width="200" title="History Table for Analysis Expanded" alt="History Stats View (expanded)" src="https://github.com/user-attachments/assets/27e3ee96-d885-4260-8a1c-41212bb0dcc0" />
<img width="200" title="Data View for Export, Delete, Refresh" alt="Data View Screen" src="https://github.com/user-attachments/assets/a3f0353b-38dc-4f70-97f2-5e080440ef3d" />

## Example of a Data Entry on fight end
```
[
  {
    "timestamp": "2026-02-11T23:04:03.806Z",
    "uuid": "a0c976b3-7560-42cd-a974-5d6867abe092",
    "skill": "Defence",
    "skillLevel": "139",
    "expForNextLevel": "644256",
    "gainedExp": "245",
    "drops": [],
    "hp": "273,514",
    "monster": "Sirin",
    "location": "The Travasi highlands",
    "damageDealt": [
      "57",
      "39"
    ],
    "damageReceived": [
      "8"
    ],
    "peopleFighting": "",
    "totalFights": "1",
    "totalInventoryHP": "273,514",
    "hpUsed": "8",
    "equipment": {
      "totals": {
        "armour": 265,
        "aim": 167,
        "power": 160
      },
      "helm": {
        "slot": "helm",
        "name": "Dragon helm",
        "title": "Dragon helm [4 Aim]",
        "imageUrl": "images/inventory/Dragon helm.png?4",
        "stats": "40",
        "enchant": "4 Aim"
      },
     ...Rest of equipment
    },
    "combatExp": [
      {
        "skill": "Defence",
        "exp": "222",
        "skillLevel": "139",
        "totalExp": "33074923",
        "expForNextLevel": "644256"
      },
      {
        "skill": "Defence",
        "exp": "23",
        "skillLevel": "139",
        "totalExp": "33074923",
        "expForNextLevel": "644256"
      }
    ],
    "actionType": "combat",
    "actionOutput": null // if skilling this would be [ { item: "Cooked Salmon", amount: 99 // total } ]
  },
];
```
## What is Syrnia Tracker?

**Syrnia Tracker** is a Chrome extension designed to automatically track and analyze gameplay statistics for the online game [Syrnia](https://www.syrnia.com). The extension monitors your gameplay in real-time, collecting data about experience gains, combat statistics, loot drops, and more, then presents this information in an organized side panel interface.

### Key Features

- **Real-time Data Tracking**: Automatically scrapes game data as you play, including:
  - Experience gains by skill
  - Combat statistics (damage dealt/received, max/average hits)
  - Loot drops with item values and profit calculations
  - Location and monster name
  - Equipment stats (armor, aim, power, travel time)

- **Historical Data Analysis**: View your tracked data filtered by:
  - Hour
  - Day
  - Week
  - Month
  - Year

- **Comprehensive Statistics**: 
  - Total experience gained per skill
  - Performance metrics by location
  - Loot value tracking with customizable item prices
  - Weekly statistics with automatic week calculation (starts Sunday 6 PM EST)

- **Data Export**: Download all tracked data as CSV files for external analysis

### Technical Architecture
The extension follows a clear separation of concerns:

- **Singular Content Script**: Handle data scraping ( `queryById("#LocationContent" || "CenterContent")` and filters `.textContent || .innerHTML` to find patterns matching `regExp` for `{SkillName} Level {levelNumber}: ({TotalExp} exp, {expForNextLevel} for next level)` and compares against the previously detected skill || totalExp value, if the same it escapes and returns to waiting for change, if different it moves the scraped data to background worker to formate and distribute to side-panel cache and chrome storage.
- **Background Service Worker**: Processes and stores data | formatting (json / csv) | Optimistically Updating RQ-Cache store and Manually updating chrome extension storage.
- **Side Panel (React)**: Displays data using TanStack Query for state management. TanStack query (Previously ReactQuery provides a cache layer, with built in properties like `isLoading`, `isError`, `isFetching`, and is good to have in place if possible API connection either to 3rd party site or Syrnia becomes available.
- **Shared Packages**: Reusable utilities, hooks, and components
- **3rd Party Sites**: As of now, the stored information is open, if a 3rd party site knows the extension is there it can acce

Data flows unidirectionally:
```
Game Page → Data Scraper → Background Worker → Both Cache and Storage -> Cache (React-query cache controls displayed data/loading/error stats) → Side Panel
On Refresh, or fresh instance, cache receives data from storage, however, on successful data grab (meaning compared against previous timestamped entry and not a duplicate) the Background worker updates both cache and storage at same time. Slight Performance improvement.
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

