import { scrapeUserStats } from '../../scrapeUserStats';
import { UPDATE_USER_STATS } from '@app/constants';

/**
 * Stats page scraper - runs in isolated content script context
 * Invisible to website JavaScript
 */
(() => {
  'use strict';

  // Verify we're on the correct URL before doing anything
  const isStatsPage = () => {
    const url = window.location.href;
    return url.includes('syrnia.com/theGame/includes2/stats.php');
  };

  // Track if we've already scraped in this session to avoid duplicate sends
  let hasScraped = false;
  let lastScrapeTime = 0;
  const SCRAPE_COOLDOWN = 5000; // Minimum 5 seconds between scrapes to avoid spam

  // Wait for page to load, then scrape and send user stats
  const scrapeAndSendUserStats = (force = false) => {
    // Double-check we're on the stats page
    if (!isStatsPage()) {
      hasScraped = false; // Reset when navigating away
      return;
    }

    const now = Date.now();
    // Allow re-scraping if forced, or if enough time has passed, or if we haven't scraped yet
    if (!force && hasScraped && now - lastScrapeTime < SCRAPE_COOLDOWN) {
      return;
    }

    // Wait a bit for the page to fully render
    setTimeout(() => {
      // Triple-check we're still on the stats page
      if (!isStatsPage()) {
        hasScraped = false;
        return;
      }

      const userStats = scrapeUserStats();
      if (userStats && userStats.username && Object.keys(userStats.skills).length > 0) {
        hasScraped = true;
        lastScrapeTime = Date.now();

        chrome.runtime.sendMessage({ type: UPDATE_USER_STATS, data: userStats });
      }
    }, 2000); // Wait 2 seconds for page to render
  };

  // Only set up scraping if we're on the stats page
  if (isStatsPage()) {
    // Run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => scrapeAndSendUserStats());
    } else {
      scrapeAndSendUserStats();
    }

    // Also set up a MutationObserver to catch dynamic content and page refreshes
    const observer = new MutationObserver(mutations => {
      // Check we're still on stats page
      if (!isStatsPage()) {
        hasScraped = false; // Reset when navigating away
        observer.disconnect();
        return;
      }

      // Re-scrape if significant content was added (page refresh or update)
      if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
        const now = Date.now();
        // Only scrape if enough time has passed since last scrape
        if (!hasScraped || now - lastScrapeTime >= SCRAPE_COOLDOWN) {
          scrapeAndSendUserStats(true);
        }
      }
    });

    // Listen for page visibility changes (handles refresh/navigation)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isStatsPage()) {
        // Reset scrape flag when page becomes visible to allow re-scraping on refresh
        hasScraped = false;
        // Scrape after a short delay to ensure page is loaded
        setTimeout(() => scrapeAndSendUserStats(), 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
})();
