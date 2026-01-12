import { REQUEST_SCREEN_DATA, UPDATE_SCREEN_DATA, UPDATE_USER_STATS } from '@extension/shared';
import { screenDataToCSVRows } from '@extension/shared/lib/utils/csv-tracker';
import {
  getTrackedData,
  appendTrackedData,
  saveUserStats,
  getLastExpBySkill,
  saveLastExpBySkill,
} from '@extension/shared/lib/utils/storage-service';
import { updateWeeklyStatsFromStatsURL } from '@extension/shared/lib/utils/weekly-stats-storage';
import type { CSVRow } from '@extension/shared/lib/utils/csv-tracker';

chrome.runtime.onMessage.addListener(message => {
  if (message.type === UPDATE_SCREEN_DATA) {
    // Process and save screen data to CSV storage
    // This is the PRIMARY source for current hour exp tracking
    // Stats page data does NOT interfere with this - they are separate systems
    processScreenData(message.data).catch(error => {
      console.error('[Background] Error processing screen data:', error);
    });

    // Forward data to the side panel for real-time updates
    chrome.runtime.sendMessage({ type: UPDATE_SCREEN_DATA, data: message.data });
  } else if (message.type === UPDATE_USER_STATS) {
    // Only save if we have valid data (username and at least one skill)
    // This comes from the stats page and is used for:
    // - Profile display (current levels, total exp, etc.)
    // - Weekly exp tracking (gainedThisWeek from stats page)
    // - Hourly exp display on stats page (gainedThisHour)
    //
    // IMPORTANT: This does NOT affect tracked current hour exp from screen data
    // The tracked current hour exp is calculated independently from screen scraping
    if (message.data && message.data.username && message.data.skills && Object.keys(message.data.skills).length > 0) {
      // Save user stats (source of truth for profile/weekly data, NOT for tracked current hour)
      saveUserStats(message.data).catch(error => {
        console.error('Error saving user stats:', error);
      });

      // Update weekly stats from stats URL (source of truth for weekly totals)
      // This uses gainedThisWeek from stats page, but doesn't affect tracked current hour
      getTrackedData()
        .then(allRows => updateWeeklyStatsFromStatsURL(message.data, allRows))
        .catch(error => {
          console.error('Error updating weekly stats from stats URL:', error);
        });

      // Forward data to the side panel for real-time updates
      chrome.runtime.sendMessage({ type: UPDATE_USER_STATS, data: message.data });
    }
  } else if (message.type === REQUEST_SCREEN_DATA) {
    // Request data from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: REQUEST_SCREEN_DATA });
      }
    });
  }

  // Return false since we're not using sendResponse
  return false;
});

/**
 * Process screen data and save to storage with calculated exp deltas
 *
 * IMPORTANT: This function ONLY processes screen data. Stats page data does NOT
 * interfere with tracked exp calculations. The lastExpBySkill is ONLY updated
 * from screen data to ensure accurate delta calculations for current hour tracking.
 */
const processScreenData = async (data: Record<string, unknown>): Promise<void> => {
  try {
    // Get last exp per skill for calculating deltas
    // This is ONLY updated from screen data, never from stats page
    const lastExpBySkill = await getLastExpBySkill();

    // Get all rows (main + combat exp gains)
    const rows = screenDataToCSVRows(data);

    // Get the main skill's exp from screen data
    const mainSkillExp = parseInt(data.actionText.exp || '0', 10) || 0;
    const mainSkill = data.actionText.currentActionText || '';

    // Calculate gainedExp for each row
    const rowsWithGainedExp = rows.map(row => {
      // Combat exp entries already have gainedExp set (these are direct gains)
      if (row.gainedExp) {
        return row;
      }

      // For main skill entries, calculate gainedExp from exp delta
      // This tracks the change in total exp since last screen update
      if (row.skill === mainSkill) {
        let gainedExp = '0';

        if (mainSkillExp > 0) {
          const lastExp = lastExpBySkill[mainSkill] || 0;
          const delta = mainSkillExp - lastExp;

          // Only record positive deltas (exp gains)
          // Negative deltas could happen if:
          // 1. Stats page was refreshed and shows different total exp
          // 2. Game was reset or character changed
          // We ignore negative deltas to maintain accurate tracking
          // Zero deltas mean no change, so no gain to record
          gainedExp = delta > 0 ? delta.toString() : '0';

          // Update last exp for this skill ONLY if we got a valid positive gain
          // This ensures lastExpBySkill only tracks from screen data progression,
          // not from stats page refreshes or external changes
          // IMPORTANT: This keeps tracked current hour exp independent from stats page
          if (delta > 0) {
            lastExpBySkill[mainSkill] = mainSkillExp;
          } else if (lastExp === 0 && mainSkillExp > 0) {
            // First time seeing this skill - initialize but don't count as gain
            // This prevents huge deltas on first screen update
            lastExpBySkill[mainSkill] = mainSkillExp;
          }
        }

        return {
          ...row,
          gainedExp,
        };
      }

      // If we can't calculate gainedExp, set to 0
      return {
        ...row,
        gainedExp: '0',
      };
    });

    // Save updated last exp per skill (ONLY if we had valid gains)
    // This ensures stats page refreshes don't interfere with tracking
    await saveLastExpBySkill(lastExpBySkill);

    // CRITICAL: Deduplicate rows before saving to prevent counting the same exp multiple times
    // Group by skill + gainedExp + rounded timestamp (to nearest second) to catch rapid scrapes
    const deduplicatedRows = new Map<string, CSVRow>();

    rowsWithGainedExp.forEach(row => {
      const skill = row.skill || '';
      const gainedExp = row.gainedExp || '0';
      const timestamp = new Date(row.timestamp);
      // Round timestamp to nearest second to group rapid scrapes together
      const roundedTimestamp = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes(),
        timestamp.getSeconds(),
      );
      const roundedTimestampStr = roundedTimestamp.toISOString();

      // For combat exp (already has gainedExp set), use skill + gainedExp + rounded timestamp
      // For main skill (calculated delta), use skill + rounded timestamp (only one per second)
      const key =
        gainedExp && parseInt(gainedExp, 10) > 0
          ? `${roundedTimestampStr}-${skill}-${gainedExp}` // Combat exp: include exp value
          : `${roundedTimestampStr}-${skill}`; // Main skill: one per second

      const existing = deduplicatedRows.get(key);

      if (!existing) {
        // No existing entry, add this one
        deduplicatedRows.set(key, row);
      } else {
        // Entry exists - merge data, ensuring totalFights is only counted once
        const existingHasData =
          (existing.drops && existing.drops.trim()) ||
          (existing.damageDealt && existing.damageDealt.trim()) ||
          (existing.damageReceived && existing.damageReceived.trim());
        const currentHasData =
          (row.drops && row.drops.trim()) ||
          (row.damageDealt && row.damageDealt.trim()) ||
          (row.damageReceived && row.damageReceived.trim());

        // Determine which row to keep (prefer one with more complete data)
        let rowToKeep = existing;
        if (currentHasData && !existingHasData) {
          rowToKeep = row;
        } else if (!currentHasData && existingHasData) {
          rowToKeep = existing;
        } else {
          // Both have data or neither has data - keep the one with higher gainedExp
          const existingExp = parseInt(existing.gainedExp || '0', 10);
          const currentExp = parseInt(row.gainedExp || '0', 10);
          if (currentExp > existingExp) {
            rowToKeep = row;
          }
        }

        // Merge totalFights: if either row has totalFights, keep it, but only count it once
        // If both have totalFights, only keep it in the merged row (don't double count)
        const existingFights = parseInt(existing.totalFights || '0', 10) || 0;
        const currentFights = parseInt(row.totalFights || '0', 10) || 0;
        const mergedFights = existingFights > 0 || currentFights > 0 ? '1' : '';

        // Create merged row with deduplicated totalFights
        const mergedRow: CSVRow = {
          ...rowToKeep,
          totalFights: mergedFights,
        };

        deduplicatedRows.set(key, mergedRow);
      }
    });

    const uniqueRows = Array.from(deduplicatedRows.values());

    // Filter out rows that have no useful data (no exp, no drops, no HP, no damage)
    // But keep rows that have ANY data (exp, drops, HP, damage, location, monster)
    const rowsToSave = uniqueRows.filter(row => {
      const hasExp = parseInt(row.gainedExp || '0', 10) > 0;
      const hasDrops = row.drops && row.drops.trim() !== '';
      const hasHP = row.hp && row.hp.trim() !== '';
      const hasDamage =
        (row.damageDealt && row.damageDealt.trim() !== '') || (row.damageReceived && row.damageReceived.trim() !== '');
      const hasLocation = row.location && row.location.trim() !== '';
      const hasMonster = row.monster && row.monster.trim() !== '';
      const hasSkill = row.skill && row.skill.trim() !== '';

      // Save if it has ANY useful data
      return hasExp || hasDrops || hasHP || hasDamage || hasLocation || hasMonster || hasSkill;
    });

    // Append to tracked data
    // This is the source of truth for current hour exp tracking
    // We save ALL rows with useful data, not just exp gains
    if (rowsToSave.length > 0) {
      await appendTrackedData(rowsToSave);
    }

    // Update weekly stats after saving
    // Note: Weekly stats use stats page as source of truth, but this doesn't
    // affect the tracked current hour data which comes from screen scraping
    const allRows = await getTrackedData();
    const { updateWeeklyStats } = await import('@extension/shared/lib/utils/weekly-stats-storage');
    await updateWeeklyStats(allRows).catch(error => {
      console.error('Error updating weekly stats:', error);
    });
  } catch (error) {
    console.error('Error in processScreenData:', error);
    throw error;
  }
};
