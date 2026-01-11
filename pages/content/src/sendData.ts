import { scrapeScreenData } from './scrapeScreenData';
import { UPDATE_SCREEN_DATA } from '@extension/shared';
import type { ScreenData } from '@extension/shared';

// Store last sent data to compare against
let lastSentData: ScreenData | null = null;

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
    console.log('[isRelevantMutation] Timer hit 0!');
    return true;
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
            if (hasExpNumbers) console.log('[isRelevantMutation] Combat exp detected!');
            if (hasDrops) console.log('[isRelevantMutation] Drops detected!');
            return true;
          }
        }
        // Check if fightLogTop appeared
        if (node.id === 'fightLogTop' || node.querySelector('#fightLogTop')) {
          console.log('[isRelevantMutation] fightLogTop appeared!');
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
        if (hasExpNumbers) console.log('[isRelevantMutation] Target contains combat exp!');
        if (hasDrops) console.log('[isRelevantMutation] Target contains drops!');
        return true;
      }
    }
  }

  // Ignore all other mutations (timer updates, etc.)
  return false;
};

// Send initial data and set up MutationObserver
const sendData = () => {
  // Check if fightLogTop appeared and start observing it if needed
  observeFightLog();

  const data = scrapeScreenData();

  // Only send if data actually changed
  if (!lastSentData || !isScreenDataEqual(lastSentData, data)) {
    console.log('sendDATA - data changed');
    lastSentData = data;
    chrome.runtime.sendMessage({ type: UPDATE_SCREEN_DATA, data });
  }
};

// Initial scrape
// sendData();

// Create observer with smarter filtering - only triggers on combat exp or timer hitting 0
const observer = new MutationObserver(mutations => {
  // Check if any mutation is relevant (combat exp appeared or timer hit 0)
  const hasRelevantMutation = mutations.some(isRelevantMutation);

  if (hasRelevantMutation) {
    console.log('[observer] Relevant mutation detected, triggering scrape');
    // Process immediately when timer hits 0 or combat exp appears
    sendData();
  }
});

// Track which elements we're already observing to avoid duplicates
const observedElements = new Set<HTMLElement>();

// Function to observe a specific element if not already observed
const observeElement = (element: HTMLElement | null, elementName: string) => {
  if (!element || observedElements.has(element)) return;

  observer.observe(element, {
    childList: true,
    subtree: true,
    characterData: true,
    // Only observe attribute changes for specific attributes we care about
    attributes: false,
  });
  observedElements.add(element);
  console.log(`[setupObserver] Now observing ${elementName}`);
};

// Function to find and observe fightLogTop and its next sibling
const observeFightLog = () => {
  const fightLogTopMarker = document.querySelector('#fightLogTop') as HTMLElement | null;

  if (fightLogTopMarker && !observedElements.has(fightLogTopMarker)) {
    // Observe the marker element itself
    observeElement(fightLogTopMarker, '#fightLogTop marker');

    // Also observe the next sibling <tr> that contains the actual content
    let nextSibling: Element | null = fightLogTopMarker.nextElementSibling;
    while (nextSibling) {
      if (nextSibling.tagName === 'TR' && nextSibling instanceof HTMLElement) {
        observeElement(nextSibling, '#fightLogTop next sibling');
        break;
      }
      nextSibling = nextSibling.nextElementSibling;
    }
  }
};

// Function to set up observer on the target elements
const setupObserver = () => {
  // Target the specific elements we care about instead of entire document.body
  const locationElement = document.querySelector('#LocationContent') as HTMLElement | null;
  const inventoryElement = document.querySelector('#inventoryStats') as HTMLElement | null;

  // Observe static elements
  if (locationElement) {
    observeElement(locationElement, '#LocationContent');
  }

  if (inventoryElement) {
    observeElement(inventoryElement, '#inventoryStats');
  }

  // Try to observe fightLogTop if it exists
  observeFightLog();

  // Also observe document.body to catch when fightLogTop is created dynamically
  // We'll use a more targeted approach - observe tables that might contain fightLogTop
  const tables = document.querySelectorAll('table');
  tables.forEach((table, index) => {
    if (table instanceof HTMLElement && !observedElements.has(table)) {
      observer.observe(table, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observedElements.add(table);
      console.log(`[setupObserver] Observing table ${index} for dynamic fightLogTop`);
    }
  });

  // Fallback: observe document.body if no elements found
  if (observedElements.size === 0) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    console.log('[setupObserver] Fallback: observing document.body');
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
  observer.disconnect();
});

// Export at end of file
export { sendData, observer };
