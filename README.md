## Table of Contents

- [What is Syrnia Tracker?](#what-is-syrnia-tracker)
- [How It Works](#how-it-works)
  - [Data Collection Process](#data-collection-process)
  - [Data Storage](#data-storage)
  - [Side Panel Interface](#side-panel-interface)
- [Installation](#installation)
  - [Chrome](#installation-chrome)
  - [Firefox](#installation-firefox)
- [Install dependency](#install-dependency)
  - [For root](#install-dependency-for-root)
  - [For module](#install-dependency-for-module)
- [Environment variables](#env-variables)
  - [Add new](#env-variables-new)
  - [Set via CLI](#env-variables-cli-set)
- [Troubleshooting](#troubleshooting)
  - [Hot module reload seems to have frozen](#hot-module-reload-seems-to-have-frozen)
  - [Imports not resolving correctly](#imports-not-resolving-correctly)
- [Community](#community)
- [Debugging](#debugging)
- [Reference](#reference)
- [Star History](#star-history)
- [Contributors](#contributors)

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

<img src="https://i.gyazo.com/1954837345d92f0455a06d6971bf23d3.png" alt="dashboard image" width="300" align="center" />

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

<img src="https://i.gyazo.com/28e6ed73a768687abd0a763dfd639b57.png" alt="dashboard image" width="300" align="center" />

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

<img src="https://i.gyazo.com/536cbd4044f46fbc2116782c080dcc87.png" width="300" align="center" />

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

<div align="center">
  <img src="https://i.gyazo.com/5f1a78b7900edb30e326db0bbd8efe97.webp" width="300" />
  <img src="https://i.gyazo.com/780e0e0abf006be7962d25a1917ba062.png" width="300" />
</div>

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

<img src="https://i.gyazo.com/2ba212467883e6fd1fa9b280fc52551e.png" width="300" />

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

## Installation

1. Clone this repository.( ```git clone https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite``` )
2. Ensure your node version is >= than in `.nvmrc` file, recommend to use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro)
3. Edit `/packages/i18n/locales/`{your locale(s)}/`messages.json`
4. In the objects `extensionDescription` and `extensionName`, change the `message` fields (leave `description` alone)
5. Install pnpm globally: `npm install -g pnpm`
6. Run `pnpm install`
7. Check if you have that configuration in your IDE/Editor:
    - <b>VS Code</b>:
        - Installed [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
        - Installed [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
        - Enabled `Typescript Workbench version` in settings:
            - CTRL + SHIFT + P -> Search: `Typescript: Select Typescript version...` -> `Use Workbench version`
            - [Read more](https://code.visualstudio.com/docs/languages/typescript#_using-newer-typescript-versions)
        - Optional, for imports to work correctly in WSL, you might need to install the [Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) extension and connect to WSL remotely from VS Code. See overview section in the extension page for more information.
    - <b>WebStorm</b>:
      - Configured [ESLint](https://www.jetbrains.com/help/webstorm/eslint.html#ws_eslint_configure_run_eslint_on_save)
      - Configured [Prettier](https://prettier.io/docs/en/webstorm.html)
      - Optional, but useful `File | Settings | Tools | Actions on Save`\
      -> `Optimize imports` and `Reformat code`
8. Run `pnpm update-version <version>` for change the `version` to the desired version of your extension.

> [!IMPORTANT]
> On Windows, make sure you have WSL enabled and Linux distribution (e.g. Ubuntu) installed on WSL.
> 
> [Installation Guide](https://learn.microsoft.com/en-us/windows/wsl/install)

<b>Then, depending on the target browser:</b>

### For Chrome: <a name="installation-chrome"></a>

1. Run:
    - Dev: `pnpm dev` (on Windows, you should run as administrator;
      see [issue#456](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/456))
    - Prod: `pnpm build`
2. Open in browser - `chrome://extensions`
3. Check - <kbd>Developer mode</kbd>
4. Click - <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the boilerplate project

### For Firefox: <a name="installation-firefox"></a>

1. Run:
    - Dev: `pnpm dev:firefox`
    - Prod: `pnpm build:firefox`
2. Open in browser - `about:debugging#/runtime/this-firefox`
3. Click - <kbd>Load Temporary Add-on...</kbd> in the upper right corner
4. Select the `./dist/manifest.json` file from the boilerplate project

> [!NOTE]
> In Firefox, you load add-ons in temporary mode. That means they'll disappear after each browser close. You have to
> load the add-on on every browser launch.

## Install dependency for turborepo: <a name="install-dependency"></a>

### For root: <a name="install-dependency-for-root"></a>

1. Run `pnpm i <package> -w`

### For module: <a name="install-dependency-for-module"></a>

1. Run `pnpm i <package> -F <module name>`

`package` - Name of the package you want to install e.g. `nodemon` \
`module-name` - You can find it inside each `package.json` under the key `name`, e.g. `@extension/content-script`, you
can use only `content-script` without `@extension/` prefix

## How do I disable modules I'm not using?

[Read here](packages/module-manager/README.md)

## Environment variables

Read: [Env Documentation](packages/env/README.md)

## Boilerplate structure <a name="structure"></a>

### Chrome extension <a name="structure-chrome-extension"></a>

The extension lives in the `chrome-extension` directory and includes the following files:

- [`manifest.ts`](chrome-extension/manifest.ts) - script that outputs the `manifest.json`
- [`src/background`](chrome-extension/src/background) - [background script](https://developer.chrome.com/docs/extensions/mv3/background_pages/)
  (`background.service_worker` in manifest.json)
- [`public`](chrome-extension/public/) - icons referenced in the manifest; content CSS for user's page injection

> [!IMPORTANT]
> To facilitate development, the boilerplate is configured to "Read and change all your data on all websites".
> In production, it's best practice to limit the premissions to only the strictly necessary websites. See
> [Declaring permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
> and edit `manifest.js` accordingly.

### Pages <a name="structure-pages"></a>

Code that is transpiled to be part of the extension lives in the [pages](pages) directory.

- [`content`](pages/content) - Scraping of data
- [`side-panel`](pages/side-panel/) - [sidepanel (Chrome 114+)](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
  (`side_panel.default_path` in manifest.json)

### Packages <a name="structure-packages"></a>

Some shared packages:

- `dev-utils` - utilities for Chrome extension development (manifest-parser, logger)
- `env` - exports object which contain all environment variables from `.env` and dynamically declared
- `hmr` - custom HMR plugin for Vite, injection script for reload/refresh, HMR dev-server
- `i18n` - custom internationalization package; provides i18n function with type safety and other validation
- `shared` - shared code for the entire project (types, constants, custom hooks, components etc.)
- `storage` - helpers for easier integration with [storage](https://developer.chrome.com/docs/extensions/reference/api/storage), e.g. local/session storages
- `tailwind-config` - shared Tailwind config for entire project
- `tsconfig` - shared tsconfig for the entire project
- `ui` - function to merge your Tailwind config with the global one; you can save components here
- `vite-config` - shared Vite config for the entire project

Other useful packages:

- `zipper` - run `pnpm zip` to pack the `dist` folder into `extension-YYYYMMDD-HHmmss.zip` inside the newly created
  `dist-zip`
- `module-manager` - run `pnpm module-manager` to enable/disable modules
- `e2e` - run `pnpm e2e` for end-to-end tests of your zipped extension on different browsers

## Troubleshooting

### Hot module reload seems to have frozen

If saving source files doesn't cause the extension HMR code to trigger a reload of the browser page, try this:

1. Ctrl+C the development server and restart it (`pnpm run dev`)
2. If you get a [`grpc` error](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/612),
   [kill the
   `turbo` process](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/612#issuecomment-2518982339)
   and run `pnpm dev` again.

### Imports not resolving correctly

If you are using WSL and imports are not resolving correctly, ensure that you have connected VS Code to WSL remotely using the [Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) extension.

## Community

To chat with other community members, you can join the [Discord](https://discord.gg/4ERQ6jgV9a) server.
You can ask questions on that server, and you can also help others.

Also, suggest new features or share any challenges you've faced while developing Chrome extensions!

## Debugging

If you're debugging one, you can use [Brie](https://go.briehq.com/github?utm_source=CEB) lets you capture screenshots, errors, and network activity, making it easier for us to help.

## Reference

- [Chrome Extensions](https://developer.chrome.com/docs/extensions)
- [Vite Plugin](https://vitejs.dev/guide/api-plugin.html)
- [Rollup](https://rollupjs.org/guide/en/)
- [Turborepo](https://turbo.build/repo/docs)
- [Rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)



