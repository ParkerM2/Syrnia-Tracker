import { scrapeScreenData } from './scrapeScreenData';
import { UPDATE_SCREEN_DATA } from '@app/constants';

/**
 * Content script for screen data scraping
 * Runs in isolated content script context - invisible to website JavaScript
 * ES modules are automatically isolated from page JavaScript
 */

// Track if extension context is still valid
let extensionContextValid = true;

// Track if we're currently processing a fight to prevent concurrent scrapes
let isProcessingFight = false;

// Declare early so it's accessible in safeSendMessage
let periodicCheckInterval: number | null = null;

// Helper function to check if extension context is still valid
const isExtensionContextValid = (): boolean => {
  try {
    // Try to access chrome.runtime.id - if it throws, context is invalidated
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Helper function to safely send messages
const safeSendMessage = (message: { type: string; data?: unknown }, callback?: (response?: unknown) => void): void => {
  if (!extensionContextValid || !isExtensionContextValid()) {
    extensionContextValid = false;
    return;
  }

  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        if (error.message && error.message.includes('Extension context invalidated')) {
          extensionContextValid = false;
          if (periodicCheckInterval) {
            clearTimeout(periodicCheckInterval);
            periodicCheckInterval = null;
          }
        }
      } else if (callback) {
        callback(response);
      }
    });
  } catch {
    extensionContextValid = false;
    if (periodicCheckInterval) {
      clearTimeout(periodicCheckInterval);
      periodicCheckInterval = null;
    }
  }
};

// Track last seen total exp values per skill to detect changes
// Key: skill name, Value: total exp value
const lastSeenExpBySkill: Map<string, number> = new Map();

/**
 * Parse skill level information from centerContent
 * Pattern: "Skill level: X (Y exp, Z for next level)"
 * Returns array of {skill, totalExp, level, expForNext}
 */
const parseSkillLevels = (): Array<{ skill: string; totalExp: number; level: number; expForNext: number }> => {
  const centerContent = document.querySelector('#centerContent');
  if (!centerContent) return [];

  const text = centerContent.textContent || '';
  const results: Array<{ skill: string; totalExp: number; level: number; expForNext: number }> = [];

  // Pattern: "SkillName level: X (Y exp, Z for next level)"
  // Matches: "Defence level: 133 (28343195 exp, 573592 for next level)"
  const skillLevelPattern = /(\w+)\s+level:\s+(\d+)\s+\((\d+)\s+exp,\s+(\d+)\s+for\s+next\s+level\)/gi;

  let match;
  while ((match = skillLevelPattern.exec(text)) !== null) {
    const skill = match[1];
    const level = parseInt(match[2], 10);
    const totalExp = parseInt(match[3], 10);
    const expForNext = parseInt(match[4], 10);

    if (skill && !isNaN(totalExp) && !isNaN(level) && !isNaN(expForNext)) {
      results.push({ skill, totalExp, level, expForNext });
    }
  }

  return results;
};

/**
 * Check if exp has increased for any skill
 * This is the primary trigger for scraping - when total exp increases, fight ended
 */
const hasExpIncreased = (): { increased: boolean; skill?: string; newExp?: number } => {
  const skillLevels = parseSkillLevels();

  if (skillLevels.length === 0) {
    return { increased: false };
  }

  // Check each skill to see if exp increased
  for (const { skill, totalExp } of skillLevels) {
    const lastExp = lastSeenExpBySkill.get(skill);

    // If we haven't seen this skill before, initialize it but don't trigger scrape
    if (lastExp === undefined) {
      lastSeenExpBySkill.set(skill, totalExp);
      continue;
    }

    // If exp increased, we have a fight end!
    if (totalExp > lastExp) {
      // Update the tracked value
      lastSeenExpBySkill.set(skill, totalExp);
      return { increased: true, skill, newExp: totalExp };
    }
  }

  return { increased: false };
};

// Send data when exp increases - this indicates fight end
const sendData = () => {
  // Prevent concurrent processing
  if (isProcessingFight) return;

  // Check if exp has increased for any skill
  const expCheck = hasExpIncreased();

  if (!expCheck.increased) {
    return; // No exp change, no scrape needed
  }

  // Exp increased - fight ended! Scrape all data now
  isProcessingFight = true;

  // Scrape the data
  const data = scrapeScreenData();
  data.totalFights = 1;
  lastSentData = data;

  safeSendMessage({ type: UPDATE_SCREEN_DATA, data }, () => {
    // After message sent, reset processing flag
    isProcessingFight = false;
  });

  // Reset flag after a short delay as fallback (in case callback doesn't fire)
  setTimeout(() => {
    isProcessingFight = false;
  }, 100);
};

/**
 * Periodic polling check - PRIMARY detection method
 * No MutationObserver footprint - completely undetectable by website
 * Uses randomized timing to avoid pattern detection
 */
const startPeriodicCheck = () => {
  if (periodicCheckInterval) return;

  const scheduleNextCheck = () => {
    if (!extensionContextValid || !isExtensionContextValid()) {
      if (periodicCheckInterval) {
        clearTimeout(periodicCheckInterval);
        periodicCheckInterval = null;
      }
      return;
    }

    // Check for exp increases (sendData handles deduplication via exp comparison)
    sendData();

    // Schedule next check with randomized timing (1.5-2.5 seconds)
    // This prevents predictable timing patterns that could be detected
    const randomDelay = 1500 + Math.random() * 1000; // 1500-2500ms
    periodicCheckInterval = window.setTimeout(scheduleNextCheck, randomDelay);
  };

  // Start the first check with initial random delay (500-1500ms)
  const initialDelay = 500 + Math.random() * 1000;
  periodicCheckInterval = window.setTimeout(scheduleNextCheck, initialDelay);
};

// Start periodic checking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPeriodicCheck);
} else {
  startPeriodicCheck();
}

// Cleanup timeout on page unload
window.addEventListener('unload', () => {
  if (periodicCheckInterval) {
    clearTimeout(periodicCheckInterval);
    periodicCheckInterval = null;
  }
});

// Export at end of file
// Note: These exports are only accessible within the module system, not to page JavaScript
// Content scripts run in an isolated world, so page JavaScript cannot access these
export { sendData };
