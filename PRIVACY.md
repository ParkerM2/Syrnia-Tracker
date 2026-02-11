# Privacy Policy — Syrnia Tracker

**Last updated:** February 2026

## Data Collection

Syrnia Tracker collects game statistics exclusively from pages on `syrnia.com`. This includes experience points, skill levels, loot data, and other in-game metrics displayed on the page.

No personal information (name, email, location, etc.) is collected.

## Data Storage

All collected data is stored locally in your browser using Chrome's built-in storage API (`chrome.storage.local`). Data never leaves your device.

## Data Transmission

Syrnia Tracker does **not** transmit any data to external servers. There are:

- No analytics or telemetry services
- No third-party APIs or SDKs
- No remote databases or cloud storage
- No advertising networks

## Permissions

The extension requests the following permissions:

- **storage** — Save tracked game data locally
- **tabs / activeTab** — Detect when you are on a Syrnia game page
- **sidePanel** — Display the tracker UI in Chrome's side panel
- **scraping** — scrapes to read game page data
- **downloads** — Export tracked data as CSV files

Host permissions are restricted to `*://*.syrnia.com/*`.

## Data Retention

All data remains in Chrome's local storage until you explicitly clear it (via the extension's settings or by clearing browser data). Uninstalling the extension removes all stored data.

## Contact

For privacy questions or concerns, please open an issue on the project's GitHub repository.
