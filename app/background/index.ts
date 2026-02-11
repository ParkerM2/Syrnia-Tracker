import { REQUEST_SCREEN_DATA, UPDATE_SCREEN_DATA, UPDATE_USER_STATS } from "@app/constants";
import { screenDataToCSVRows } from "@app/utils/csv-tracker";
import {
  getTrackedData,
  appendTrackedData,
  saveUserStats,
  getLastExpBySkill,
  saveLastExpBySkill,
} from "@app/utils/storage-service";
import { updateWeeklyStatsFromStatsURL } from "@app/utils/weekly-stats-storage";
import type { ScreenData } from "@app/types";
import type { CSVRow } from "@app/utils/csv-tracker";

chrome.runtime.onMessage.addListener((message, sender) => {
  // Only process messages from content scripts (sender.tab exists)
  // Ignore messages from background script itself or side panel
  if (!sender || !sender.tab) {
    return false;
  }

  if (message.type === UPDATE_SCREEN_DATA) {
    // Process and save screen data to CSV storage
    // This is the PRIMARY source for current hour exp tracking
    // Stats page data does NOT interfere with this - they are separate systems
    processScreenData(message.data as ScreenData)
      .then(() => {
        // Always forward screen data to the side panel so it can update its live display
        // (current skill, action text, etc.) regardless of whether CSV rows were saved.
        // The baseline-setting scrape may not save rows but the panel still needs the data.
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: UPDATE_SCREEN_DATA, data: message.data }).catch(() => {
            // Silently handle errors (side panel might not be open)
          });
        }, 50);
      })
      .catch(() => {
        // Silently handle errors
      });
    // Return false since we're handling this asynchronously
    return false;
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
      saveUserStats(message.data).catch(() => {
        // Silently handle errors
      });

      // Update weekly stats from stats URL (source of truth for weekly totals)
      // This uses gainedThisWeek from stats page, but doesn't affect tracked current hour
      getTrackedData()
        .then(allRows => updateWeeklyStatsFromStatsURL(message.data, allRows))
        .catch(() => {
          // Silently handle errors
        });

      // Forward data to the side panel for real-time updates
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: UPDATE_USER_STATS, data: message.data }).catch(() => {
          // Silently handle errors (side panel might not be open)
        });
      }, 50);
    }
    // Return false since we're handling this asynchronously
    return false;
  } else if (message.type === REQUEST_SCREEN_DATA) {
    // Request data from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: REQUEST_SCREEN_DATA });
      }
    });
    return false;
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
 *
 * @returns true if data was successfully saved, false otherwise
 */
const processScreenData = async (data: ScreenData): Promise<boolean> => {
  // Get last exp per skill for calculating deltas
  // This is ONLY updated from screen data, never from stats page
  const lastExpBySkill = await getLastExpBySkill();

  // Get all rows (main + combat exp gains)
  const rows = screenDataToCSVRows(data);

  // Get the main skill's exp from screen data
  const mainSkillExp = parseInt(data.actionText.exp || "0", 10) || 0;
  const mainSkill = data.actionText.currentActionText || "";

  // Maximum gap between scrapes before we consider the baseline stale (5 minutes)
  const MAX_SCRAPE_GAP_MS = 5 * 60 * 1000;
  const now = Date.now();

  // Calculate gainedExp for each row
  const rowsWithGainedExp = rows.map(row => {
    // If gainedExp is already set, use it
    if (row.gainedExp) {
      return row;
    }

    // For main skill entries, calculate gainedExp from exp delta
    // This tracks the change in total exp since last screen update
    if (row.skill === mainSkill) {
      let gainedExp = "0";

      if (mainSkillExp > 0) {
        const lastEntry = lastExpBySkill[mainSkill];

        if (!lastEntry || lastEntry.exp === 0) {
          // First time seeing this skill — initialize baseline, don't count as gain
          lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
          gainedExp = "0";
        } else if (now - lastEntry.ts > MAX_SCRAPE_GAP_MS) {
          // Stale gap — reset baseline, don't attribute the accumulated delta
          lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
          gainedExp = "0";
        } else {
          // Normal case — compute delta
          const delta = mainSkillExp - lastEntry.exp;
          gainedExp = delta > 0 ? delta.toString() : "0";

          if (delta > 0) {
            lastExpBySkill[mainSkill] = { exp: mainSkillExp, ts: now };
          } else {
            // Update timestamp even if no gain (keeps the baseline fresh)
            lastExpBySkill[mainSkill] = { ...lastEntry, ts: now };
          }
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
      gainedExp: "0",
    };
  });

  // Save updated last exp per skill (ONLY if we had valid gains)
  // This ensures stats page refreshes don't interfere with tracking
  await saveLastExpBySkill(lastExpBySkill);

  // CRITICAL: Deduplicate rows before saving to prevent counting the same exp multiple times
  // When a fight ends, all data is available at once - we should only process it once
  // Use UUID as primary deduplication key since each screen scrape has a unique UUID
  // All rows from the same screen scrape share the same UUID, so group by UUID + skill
  const deduplicatedRows = new Map<string, CSVRow>();

  rowsWithGainedExp.forEach(row => {
    const skill = row.skill || "";
    const uuid = row.uuid || "";
    const gainedExp = row.gainedExp || "0";
    const monster = row.monster || "";
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

    // Primary deduplication: Use UUID + skill if UUID is available (new format)
    // This ensures all rows from the same screen scrape are properly grouped
    // Fallback: Use timestamp + monster + skill + gainedExp for old format rows without UUID
    const key = uuid
      ? `${uuid}-${skill}` // New format: UUID + skill (most reliable)
      : monster && (row.totalFights === "1" || parseInt(gainedExp, 10) > 0)
        ? gainedExp && parseInt(gainedExp, 10) > 0
          ? `${roundedTimestampStr}-${monster}-${skill}-${gainedExp}` // Fight end combat exp: include monster
          : `${roundedTimestampStr}-${monster}-${skill}` // Fight end main skill: include monster
        : gainedExp && parseInt(gainedExp, 10) > 0
          ? `${roundedTimestampStr}-${skill}-${gainedExp}` // Non-fight combat exp: include exp value
          : `${roundedTimestampStr}-${skill}`; // Non-fight main skill: one per second

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
      // Also preserve location and monster from the row with more complete data
      let rowToKeep = existing;
      if (currentHasData && !existingHasData) {
        rowToKeep = row;
      } else if (!currentHasData && existingHasData) {
        rowToKeep = existing;
      } else {
        // Both have data or neither has data - keep the one with higher gainedExp
        const existingExp = parseInt(existing.gainedExp || "0", 10);
        const currentExp = parseInt(row.gainedExp || "0", 10);
        if (currentExp > existingExp) {
          rowToKeep = row;
        }
      }

      // Preserve location and monster from the row with more complete data
      // If rowToKeep doesn't have location/monster but the other row does, use the other row's values
      const locationToKeep = rowToKeep.location?.trim() || row.location?.trim() || existing.location?.trim() || "";
      const monsterToKeep = rowToKeep.monster?.trim() || row.monster?.trim() || existing.monster?.trim() || "";

      // Merge totalFights: if either row has totalFights, keep it, but only count it once
      // If both have totalFights, only keep it in the merged row (don't double count)
      const existingFights = parseInt(existing.totalFights || "0", 10) || 0;
      const currentFights = parseInt(row.totalFights || "0", 10) || 0;
      const mergedFights = existingFights > 0 || currentFights > 0 ? "1" : "";

      // Merge drops from both rows to preserve all drop data
      const existingDrops = existing.drops || "";
      const currentDrops = row.drops || "";
      const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== "").join(";");

      // Create merged row with deduplicated totalFights, merged drops, and preserved location/monster
      const mergedRow: CSVRow = {
        ...rowToKeep,
        totalFights: mergedFights,
        drops: mergedDrops,
        location: locationToKeep,
        monster: monsterToKeep,
      };

      deduplicatedRows.set(key, mergedRow);
    }
  });

  const uniqueRows = Array.from(deduplicatedRows.values());

  // Only save rows that have meaningful data.
  // Require a skill name OR fight/combat indicators, plus at least one meaningful data field.
  const rowsToSave = uniqueRows.filter(row => {
    const hasSkill = row.skill && row.skill.trim() !== "";
    const hasExp = parseInt(row.gainedExp || "0", 10) > 0;
    const hasDrops = row.drops && row.drops.trim() !== "";
    const hasDamage =
      (row.damageDealt && row.damageDealt.trim() !== "") || (row.damageReceived && row.damageReceived.trim() !== "");
    const hasEquipment = row.equipment && row.equipment.trim() !== "";
    const hasLocationAndMonster =
      row.location && row.location.trim() !== "" && row.monster && row.monster.trim() !== "";
    const hasTotalFights = row.totalFights && row.totalFights.trim() !== "" && parseInt(row.totalFights, 10) > 0;
    const hasCombatExp = row.combatExp && row.combatExp.trim() !== "";
    const hasActionOutput = row.actionOutput && row.actionOutput.trim() !== "" && row.actionOutput !== "[]";

    // Must have at least one identity marker (skill name, fight count, or combat exp)
    if (!hasSkill && !hasTotalFights && !hasCombatExp) {
      return false;
    }

    // Save if it has meaningful data
    return (
      hasExp || hasDrops || hasDamage || hasEquipment || hasLocationAndMonster || hasTotalFights || hasActionOutput
    );
  });

  // Append to tracked data
  let dataSaved = false;
  if (rowsToSave.length > 0) {
    await appendTrackedData(rowsToSave);
    dataSaved = true;
  }

  // Update weekly stats after saving
  // Note: Weekly stats use stats page as source of truth, but this doesn't
  // affect the tracked current hour data which comes from screen scraping
  const allRows = await getTrackedData();
  const { updateWeeklyStats } = await import("@app/utils/weekly-stats-storage");
  await updateWeeklyStats(allRows).catch(() => {
    // Silently handle errors
  });

  return dataSaved;
};
