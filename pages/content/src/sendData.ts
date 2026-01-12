import { scrapeScreenData } from './scrapeScreenData';
import { UPDATE_SCREEN_DATA } from '@extension/shared';
import type { ScreenData } from '@extension/shared';

// Store last sent data to compare against
let lastSentData: ScreenData | null = null;

// Track if extension context is still valid
let extensionContextValid = true;

// Track last logged fight to prevent spam
let lastLoggedFight: string | null = null;

// Declare these early so they're accessible in safeSendMessage
let periodicCheckInterval: number | null = null;
let observer: MutationObserver | null = null;

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
    console.warn('[sendData] Extension context invalidated - cannot send messages. Page may need to be refreshed.');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        // Check if error is due to invalidated context
        if (error.message && error.message.includes('Extension context invalidated')) {
          extensionContextValid = false;
          console.warn('[sendData] Extension context invalidated - stopping message sending');
          // Stop periodic checks and observers
          if (periodicCheckInterval) {
            clearInterval(periodicCheckInterval);
            periodicCheckInterval = null;
          }
          if (observer) {
            observer.disconnect();
            observer = null;
          }
        } else {
          console.error('[sendData] Error sending message:', error);
        }
      } else if (callback) {
        callback(response);
      }
    });
  } catch (error) {
    extensionContextValid = false;
    console.error('[sendData] Exception sending message:', error);
    // Stop periodic checks and observers
    if (periodicCheckInterval) {
      clearInterval(periodicCheckInterval);
      periodicCheckInterval = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
};

// Helper to compare arrays
const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => JSON.stringify(val) === JSON.stringify(b[index]));
};

// Deep comparison function for ScreenData
const isScreenDataEqual = (a: ScreenData, b: ScreenData): boolean =>
  a.actionText.currentActionText === b.actionText.currentActionText &&
  a.actionText.exp === b.actionText.exp &&
  a.actionText.speedText === b.actionText.speedText &&
  a.actionText.addExp === b.actionText.addExp &&
  a.actionText.skillLevel === b.actionText.skillLevel &&
  a.actionText.expForNextLevel === b.actionText.expForNextLevel &&
  a.actionText.inventory.hp === b.actionText.inventory.hp &&
  a.actionText.inventory.farmingExp === b.actionText.inventory.farmingExp &&
  arraysEqual(a.actionText.combatExp, b.actionText.combatExp) &&
  arraysEqual(a.actionText.drops, b.actionText.drops);

// Track the last timer value to detect when it hits 0
let lastTimerValue: string | null = null;

// Check if timer has hit 0
const isTimerAtZero = (): boolean => {
  // Look for timer displays in common locations
  const locationContent = document.querySelector('#LocationContent');
  const fightLogTop = document.querySelector('#fightLogTop');
  const allText = (locationContent?.textContent || '') + ' ' + (fightLogTop?.textContent || '');

  // Check for timer patterns: "0", "00:00", "0s", etc.
  const timerMatch = allText.match(/\b(0|00:00|0s|0m)\b/);
  if (timerMatch) {
    const timerText = timerMatch[0];
    // Only trigger if timer just hit 0 (wasn't 0 before)
    if (lastTimerValue !== timerText && (timerText === '0' || timerText === '00:00' || timerText === '0s')) {
      lastTimerValue = timerText;
      return true;
    }
  }

  // Reset lastTimerValue if timer is no longer at 0
  if (lastTimerValue && !timerMatch) {
    lastTimerValue = null;
  }

  return false;
};

// Check if a mutation is relevant (combat exp appeared or timer hit 0)
const isRelevantMutation = (mutation: MutationRecord): boolean => {
  const target = mutation.target;

  // Always check if timer hit 0 first
  if (isTimerAtZero()) {
    return true;
  }

  // Handle characterData mutations (text content changes)
  // This catches exp value changes in #LocationContent
  if (mutation.type === 'characterData') {
    // Check if the mutation is in LocationContent (where exp values are displayed)
    const locationElement = document.querySelector('#LocationContent');
    if (target === locationElement || (target instanceof Node && locationElement?.contains(target))) {
      return true;
    }

    // Check if mutation is in inventoryStats (HP changes)
    const inventoryElement = document.querySelector('#inventoryStats');
    if (target === inventoryElement || (target instanceof Node && inventoryElement?.contains(target))) {
      return true;
    }
  }

  // Check if combat experience or drops appeared (font elements with color)
  if (mutation.type === 'childList') {
    const addedNodes = Array.from(mutation.addedNodes);
    const hasRelevantContent = addedNodes.some(node => {
      if (node instanceof HTMLElement) {
        // Check for font elements with color (combat exp in red, drops in yellow)
        const fontElements = node.querySelectorAll?.('font[color]');
        if (fontElements && fontElements.length > 0) {
          // Check for red font elements with numbers (exp values)
          const hasExpNumbers = Array.from(fontElements).some(font => {
            const color = font.getAttribute('color')?.toLowerCase();
            const text = font.textContent?.trim() || '';
            return color === 'red' && /^\d+$/.test(text);
          });
          // Check for yellow font elements (drops)
          const hasDrops = Array.from(fontElements).some(font => {
            const color = font.getAttribute('color')?.toLowerCase();
            return color === 'yellow';
          });
          if (hasExpNumbers || hasDrops) {
            return true;
          }
        }
        // Check if fightLogTop appeared
        if (node.id === 'fightLogTop' || node.querySelector('#fightLogTop')) {
          return true;
        }
      }
      return false;
    });

    if (hasRelevantContent) {
      return true;
    }
  }

  // Check if target contains combat exp or drops
  if (target instanceof HTMLElement) {
    const fontElements = target.querySelectorAll?.('font[color]');
    if (fontElements && fontElements.length > 0) {
      // Check for red font elements with numbers (exp values)
      const hasExpNumbers = Array.from(fontElements).some(font => {
        const color = font.getAttribute('color')?.toLowerCase();
        const text = font.textContent?.trim() || '';
        return color === 'red' && /^\d+$/.test(text);
      });
      // Check for yellow font elements (drops)
      const hasDrops = Array.from(fontElements).some(font => {
        const color = font.getAttribute('color')?.toLowerCase();
        return color === 'yellow';
      });
      if (hasExpNumbers || hasDrops) {
        return true;
      }
    }

    // Also check if target is LocationContent or inventoryStats (exp/HP text changes)
    if (target.id === 'LocationContent' || target.id === 'inventoryStats') {
      return true;
    }
  }

  // Ignore all other mutations (timer updates, etc.)
  return false;
};

// Track which elements we're already observing to avoid duplicates
const observedElements = new Set<HTMLElement>();

// Function to observe a specific element if not already observed
// Note: observer must be initialized before this can be used
const observeElement = (element: HTMLElement | null) => {
  if (!element || observedElements.has(element) || !observer) return;

  const currentObserver = observer; // Capture for TypeScript
  currentObserver.observe(element, {
    childList: true,
    subtree: true,
    characterData: true, // Critical: catch text content changes (exp values, HP, etc.)
    // Only observe attribute changes for specific attributes we care about
    attributes: false,
  });
  observedElements.add(element);
};

// Function to find and observe fightLogTop and its next sibling
// Note: observer must be initialized before this can be used
const observeFightLog = () => {
  if (!observer) {
    console.warn('[observeFightLog] Observer not initialized yet');
    return;
  }

  const fightLogTopMarker = document.querySelector('#fightLogTop') as HTMLElement | null;

  if (fightLogTopMarker && !observedElements.has(fightLogTopMarker)) {
    // Observe the marker element itself
    observeElement(fightLogTopMarker);

    // Also observe the next sibling <tr> that contains the actual content
    let nextSibling: Element | null = fightLogTopMarker.nextElementSibling;
    while (nextSibling) {
      if (nextSibling.tagName === 'TR' && nextSibling instanceof HTMLElement) {
        observeElement(nextSibling);
        break;
      }
      nextSibling = nextSibling.nextElementSibling;
    }
  }
};

// Send initial data and set up MutationObserver
const sendData = () => {
  // Check if fightLogTop appeared and start observing it if needed
  observeFightLog();

  const data = scrapeScreenData();

  // Check if exp value changed (even if other fields didn't)
  const expChanged =
    !lastSentData ||
    lastSentData.actionText.exp !== data.actionText.exp ||
    lastSentData.actionText.addExp !== data.actionText.addExp;

  // Check if skill changed
  const skillChanged = !lastSentData || lastSentData.actionText.currentActionText !== data.actionText.currentActionText;

  // Check if level changed
  const levelChanged = !lastSentData || lastSentData.actionText.skillLevel !== data.actionText.skillLevel;

  // Check if combat exp changed
  const combatExpChanged = !lastSentData || !arraysEqual(lastSentData.actionText.combatExp, data.actionText.combatExp);

  // Check if drops changed
  const dropsChanged = !lastSentData || !arraysEqual(lastSentData.actionText.drops, data.actionText.drops);

  // Check if HP changed
  const hpChanged = !lastSentData || lastSentData.actionText.inventory.hp !== data.actionText.inventory.hp;

  // Check if hpUsed changed (HP used from food during fight)
  const hpUsedChanged = !lastSentData || lastSentData.hpUsed !== data.hpUsed;

  // Send if ANY relevant data changed
  const hasRelevantChange =
    expChanged ||
    skillChanged ||
    levelChanged ||
    combatExpChanged ||
    dropsChanged ||
    hpChanged ||
    hpUsedChanged ||
    !lastSentData ||
    !isScreenDataEqual(lastSentData, data);

  if (hasRelevantChange) {
    // Check if this is a new fight ending (to prevent spam logging)
    const fightLogTopMarker = document.querySelector('#fightLogTop');
    let fightEnded = false;
    let fightKey: string | null = null;

    if (fightLogTopMarker) {
      let nextSibling = fightLogTopMarker.nextElementSibling;
      while (nextSibling) {
        if (nextSibling.tagName === 'TR') {
          const fightText = nextSibling.textContent || '';
          if (/you\s+defeated/i.test(fightText)) {
            // Create a unique key for this fight (monster + timestamp rounded to second)
            const monster = data.monster || 'unknown';
            const timestamp = new Date(data.timestamp);
            const roundedTimestamp = new Date(
              timestamp.getFullYear(),
              timestamp.getMonth(),
              timestamp.getDate(),
              timestamp.getHours(),
              timestamp.getMinutes(),
              timestamp.getSeconds(),
            );
            fightKey = `${monster}-${roundedTimestamp.toISOString()}`;

            // Only log if this is a new fight (different from last logged)
            if (fightKey !== lastLoggedFight) {
              fightEnded = true;
              lastLoggedFight = fightKey;
            }
            break;
          }
          nextSibling = nextSibling.nextElementSibling;
        }
      }
    }

    // Set totalFights when fight ends
    if (fightEnded) {
      data.totalFights = 1; // Mark this row as a completed fight
    }

    lastSentData = data;

    // Use safe send message wrapper
    safeSendMessage({ type: UPDATE_SCREEN_DATA, data });
  }
};

// Initial scrape - send data when page loads
sendData();

// Also set up periodic checking to catch exp/level changes that might not trigger mutations
// Check every 1 second for exp/level changes (more aggressive to catch all changes)
const startPeriodicCheck = () => {
  if (periodicCheckInterval) return; // Already running

  periodicCheckInterval = window.setInterval(() => {
    // Stop if extension context is invalidated
    if (!extensionContextValid || !isExtensionContextValid()) {
      if (periodicCheckInterval) {
        clearInterval(periodicCheckInterval);
        periodicCheckInterval = null;
      }
      return;
    }

    const data = scrapeScreenData();

    // Check if exp or level changed since last check
    if (lastSentData) {
      const expChanged =
        lastSentData.actionText.exp !== data.actionText.exp ||
        lastSentData.actionText.addExp !== data.actionText.addExp;
      const levelChanged = lastSentData.actionText.skillLevel !== data.actionText.skillLevel;
      const skillChanged = lastSentData.actionText.currentActionText !== data.actionText.currentActionText;
      const hpChanged = lastSentData.actionText.inventory.hp !== data.actionText.inventory.hp;
      const combatExpChanged = !arraysEqual(lastSentData.actionText.combatExp, data.actionText.combatExp);
      const dropsChanged = !arraysEqual(lastSentData.actionText.drops, data.actionText.drops);
      const hpUsedChanged = lastSentData.hpUsed !== data.hpUsed;

      // Check for fight ending - look for "You defeated" text in fightLogTop
      // This is important because damage is only parsed when fight ends
      // The periodic check serves as a backup if the mutation observer misses it
      let fightEnded = false;
      const fightLogTopMarker = document.querySelector('#fightLogTop');
      if (fightLogTopMarker) {
        let nextSibling = fightLogTopMarker.nextElementSibling;
        while (nextSibling) {
          if (nextSibling.tagName === 'TR') {
            const fightText = nextSibling.textContent || '';
            if (/you\s+defeated/i.test(fightText)) {
              // Check if we have damage data that wasn't in the last sent data
              // This indicates a new fight ended
              const hasNewDamage =
                (data.damageDealt && data.damageDealt.length > 0) ||
                (data.damageReceived && data.damageReceived.length > 0);
              const lastHadDamage =
                (lastSentData.damageDealt && lastSentData.damageDealt.length > 0) ||
                (lastSentData.damageReceived && lastSentData.damageReceived.length > 0);

              // Check if we have hpUsed that wasn't in the last sent data
              const hasNewHpUsed = data.hpUsed !== null && data.hpUsed !== undefined;
              const lastHadHpUsed = lastSentData.hpUsed !== null && lastSentData.hpUsed !== undefined;

              // If we have damage data and last sent data didn't, or monster changed, fight ended
              if (hasNewDamage && !lastHadDamage) {
                fightEnded = true;
              } else if (hasNewHpUsed && !lastHadHpUsed) {
                // New hpUsed detected (food eaten during fight)
                fightEnded = true;
              } else if (data.monster && lastSentData.monster && data.monster !== lastSentData.monster) {
                // Monster changed, new fight
                fightEnded = true;
              }
            }
            break;
          }
          nextSibling = nextSibling.nextElementSibling;
        }
      }

      if (
        expChanged ||
        levelChanged ||
        skillChanged ||
        hpChanged ||
        combatExpChanged ||
        dropsChanged ||
        hpUsedChanged ||
        fightEnded
      ) {
        sendData();
      }
    } else {
      // First time, send initial data
      sendData();
    }
  }, 1000); // Check every 1 second (more frequent)
};

// Start periodic checking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPeriodicCheck);
} else {
  startPeriodicCheck();
}

// Cleanup interval on page unload
window.addEventListener('unload', () => {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval);
    periodicCheckInterval = null;
  }
});

// Create observer with smarter filtering - only triggers on combat exp or timer hitting 0
observer = new MutationObserver(mutations => {
  // Stop if extension context is invalidated
  if (!extensionContextValid || !isExtensionContextValid()) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    return;
  }

  // Check if any mutation is relevant (combat exp appeared or timer hit 0)
  const hasRelevantMutation = mutations.some(isRelevantMutation);

  if (hasRelevantMutation) {
    // Process immediately when timer hits 0 or combat exp appears
    sendData();
  }
});

// Function to set up observer on the target elements
const setupObserver = () => {
  // Target the specific elements we care about instead of entire document.body
  const locationElement = document.querySelector('#LocationContent') as HTMLElement | null;
  const inventoryElement = document.querySelector('#inventoryStats') as HTMLElement | null;

  // Observe static elements with characterData to catch text changes
  if (locationElement && observer) {
    // Observe with characterData to catch exp value changes
    if (!observedElements.has(locationElement)) {
      observer.observe(locationElement, {
        childList: true,
        subtree: true,
        characterData: true, // Critical: catch text content changes
      });
      observedElements.add(locationElement);
    }
  }

  if (inventoryElement && observer) {
    // Observe with characterData to catch HP changes
    if (!observedElements.has(inventoryElement)) {
      observer.observe(inventoryElement, {
        childList: true,
        subtree: true,
        characterData: true, // Critical: catch text content changes
      });
      observedElements.add(inventoryElement);
    }
  }

  // Try to observe fightLogTop if it exists
  observeFightLog();

  // Observe document.body once to catch when fightLogTop is created dynamically
  // This is more efficient than observing all tables individually
  // The mutation observer will filter for relevant changes via isRelevantMutation
  if (observer) {
    const currentObserver = observer; // Capture for TypeScript

    // Only observe document.body if we haven't already set up specific element observers
    // or if we need a fallback for dynamic content
    const needsBodyObserver = !observedElements.has(document.body as HTMLElement);

    // Find the table containing fightLogTop if it exists
    const fightLogTopMarker = document.querySelector('#fightLogTop');
    let fightLogTable: HTMLElement | null = null;
    if (fightLogTopMarker) {
      // Find the parent table
      let parent = fightLogTopMarker.parentElement;
      while (parent && parent.tagName !== 'TABLE') {
        parent = parent.parentElement;
      }
      if (parent instanceof HTMLElement) {
        fightLogTable = parent;
      }
    }

    // Observe the specific table containing fightLogTop if found
    if (fightLogTable && !observedElements.has(fightLogTable)) {
      currentObserver.observe(fightLogTable, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observedElements.add(fightLogTable);
    } else if (needsBodyObserver) {
      // Fallback: observe document.body to catch all dynamic content
      // This is more efficient than observing 11+ tables separately
      currentObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observedElements.add(document.body as HTMLElement);
    }
  }
};

// Set up observer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupObserver);
} else {
  setupObserver();
}

// Cleanup observer on page unload
window.addEventListener('unload', () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

// Export at end of file
export { sendData, observer };
