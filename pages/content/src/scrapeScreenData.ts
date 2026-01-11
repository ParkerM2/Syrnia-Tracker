import { matchText, skillExpRegex } from '@extension/shared';
import type { ScreenData, CombatExpGain } from '@extension/shared';

/**
 * Parse combat experience gains from fightLogTop element
 * Structure: "You got " <font color="red">27</font>" strength experience."
 * Multiple entries can exist in the same element
 */
const parseCombatExp = (fightLogElement: HTMLElement | null): CombatExpGain[] => {
  if (!fightLogElement) {
    return [];
  }

  const expGains: CombatExpGain[] = [];
  const fullText = fightLogElement.textContent || '';

  // Find all font elements with color attribute - red for experience, yellow for drops
  const fontElements = fightLogElement.querySelectorAll('font[color]');

  // Only check red font elements for experience (drops are in yellow)
  const redFontElements = Array.from(fontElements).filter(font => {
    const color = font.getAttribute('color')?.toLowerCase();
    return color === 'red';
  });

  // Skill name normalization map
  const skillMap: Record<string, string> = {
    strength: 'Strength',
    attack: 'Attack',
    defence: 'Defence',
    defense: 'Defence',
    health: 'Health',
    mining: 'Mining',
    smithing: 'Smithing',
    fishing: 'Fishing',
    woodcutting: 'Woodcutting',
    construction: 'Construction',
    trading: 'Trading',
    thieving: 'Thieving',
    speed: 'Speed',
    cooking: 'Cooking',
    magic: 'Magic',
    farming: 'Farming',
  };

  // Only process red font elements (experience values)
  redFontElements.forEach(font => {
    const expValue = font.textContent?.trim();

    // Experience values should be pure numbers
    if (!expValue || !/^\d+$/.test(expValue)) {
      return; // Skip if not a pure number
    }

    // The structure can be:
    // 1. "You got " <font>27</font>" strength experience."
    // 2. "You also gained " <font>1</font>" defence experience from your dragon armour!"
    // Pattern: " [number]" " [skill] experience" or [number] [skill] experience
    const patterns = [
      // Match: " [number]" " [skill] experience" (with quotes around number)
      new RegExp(`"${expValue}"\\s+"?([a-z]+)\\s+experience`, 'i'),
      // Match: [number] " [skill] experience" (number followed by quote and skill)
      new RegExp(`${expValue}"\\s+"?([a-z]+)\\s+experience`, 'i'),
      // Match: [number] [skill] experience (without quotes, directly after font)
      new RegExp(`${expValue}\\s+"?([a-z]+)\\s+experience`, 'i'),
      // Match: got [number] [skill] experience
      new RegExp(`got\\s+"?${expValue}"?\\s+([a-z]+)\\s+experience`, 'i'),
      // Match: You got [number] [skill] experience
      new RegExp(`You\\s+got\\s+"?${expValue}"?\\s+([a-z]+)\\s+experience`, 'i'),
      // Match: also gained [number] [skill] experience (bonus exp from armor)
      new RegExp(`also\\s+gained\\s+"?${expValue}"?\\s+([a-z]+)\\s+experience`, 'i'),
      // Match: You also gained [number] [skill] experience (bonus exp from armor)
      new RegExp(`You\\s+also\\s+gained\\s+"?${expValue}"?\\s+([a-z]+)\\s+experience`, 'i'),
      // Match: gained [number] [skill] experience from (bonus exp from armor)
      new RegExp(`gained\\s+"?${expValue}"?\\s+([a-z]+)\\s+experience\\s+from`, 'i'),
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = fullText.match(pattern);

      if (match && match[1]) {
        const skill = match[1].toLowerCase().trim();
        const normalizedSkill = skillMap[skill] || skill.charAt(0).toUpperCase() + skill.slice(1);

        expGains.push({
          skill: normalizedSkill,
          exp: expValue,
        });
        break; // Found a match, move to next font element
      }
    }
  });

  // After finding all exp gains, extract level information for each skill from the full text
  // Format: "Defence level: 122 (21024488 exp, 387962 for next level)"
  expGains.forEach(gain => {
    const skillName = gain.skill;
    // Try to match the level pattern for this skill
    const levelRegex = skillExpRegex(skillName);
    const levelMatch = fullText.match(levelRegex);

    if (levelMatch && levelMatch[1] && levelMatch[2] && levelMatch[3]) {
      // Level info found - save it to the gain object
      gain.skillLevel = levelMatch[1];
      gain.totalExp = levelMatch[2]; // Total exp for this skill
      gain.expForNextLevel = levelMatch[3];
    }
  });

  // Remove duplicates (same skill and exp in the same scrape)
  const uniqueGains = expGains.filter(
    (gain, index, self) => index === self.findIndex(g => g.skill === gain.skill && g.exp === gain.exp),
  );

  return uniqueGains;
};

/**
 * Parse monster name from LocationContent or fightLogTop
 * Monster name is typically mentioned in the combat text
 * Examples: "You struck and dealt 23 damage to the Rima General."
 *           "The Rima General struck at you and did 3 damage"
 */
const parseMonster = (locationElement: HTMLElement | null, fightLogElement: HTMLElement | null): string => {
  // Try fightLogTop first - format: "You defeated {monster}."
  if (fightLogElement) {
    const fightText = fightLogElement.textContent || '';

    // Primary pattern: "You defeated {monster}."
    const defeatedPattern = /you\s+defeated\s+(.+?)(?:\.|$)/i;
    const defeatedMatch = fightText.match(defeatedPattern);
    if (defeatedMatch && defeatedMatch[1]) {
      let monster = defeatedMatch[1].trim();
      // Remove "the " prefix if present
      monster = monster.replace(/^the\s+/i, '');
      // Filter out common false positives
      if (
        monster.length > 2 &&
        !monster.toLowerCase().includes('level') &&
        !monster.toLowerCase().includes('exp') &&
        !monster.toLowerCase().includes('damage') &&
        !monster.toLowerCase().includes('you')
      ) {
        return monster;
      }
    }

    // Fallback patterns for extracting monster from damage text
    const monsterPatterns = [
      // "You struck and dealt 23 damage to the Rima General."
      /(?:dealt|deal)\s+\d+\s+damage\s+to\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)(?:\.|$)/i,
      // "You hit the Rima General for 23 damage"
      /you\s+hit\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)\s+for\s+\d+\s+damage/i,
      // "You struck the Rima General for 23 damage"
      /you\s+struck\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)\s+for\s+\d+\s+damage/i,
      // "The Rima General struck at you and did 3 damage"
      /(?:the\s+)?([A-Z][a-zA-Z\s]+?)\s+struck\s+(?:at\s+)?you/i,
      // "Rima General struck at you" (without "the")
      /([A-Z][a-zA-Z\s]+?)\s+struck\s+(?:at\s+)?you/i,
      // "You hit [Monster] for X damage"
      /(?:hit|struck)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?)\s+(?:for|and)/i,
    ];

    for (let i = 0; i < monsterPatterns.length; i++) {
      const pattern = monsterPatterns[i];
      const match = fightText.match(pattern);
      if (match && match[1]) {
        let monster = match[1].trim();
        // Remove "the " prefix if present
        monster = monster.replace(/^the\s+/i, '');
        // Filter out common false positives
        if (
          monster.length > 2 &&
          !monster.toLowerCase().includes('level') &&
          !monster.toLowerCase().includes('exp') &&
          !monster.toLowerCase().includes('damage') &&
          !monster.toLowerCase().includes('you')
        ) {
          return monster;
        }
      }
    }
  }

  // Try to find monster name in LocationContent as fallback
  // Format: "You are attacking a {monster} {level} at {location}."
  if (locationElement) {
    const locationText = locationElement.textContent || '';

    // Pattern: "You are attacking a {monster} {level} at {location}."
    // Extract monster (before the level number and "at")
    const attackingPattern = /you\s+are\s+attacking\s+a\s+([A-Z][a-zA-Z\s]+?)\s+\d+\s+at/i;
    const attackingMatch = locationText.match(attackingPattern);
    if (attackingMatch && attackingMatch[1]) {
      let monster = attackingMatch[1].trim();
      // Remove "the " prefix if present (shouldn't be needed here, but just in case)
      monster = monster.replace(/^the\s+/i, '');
      if (monster.length > 2) {
        return monster;
      }
    }
  }

  return '';
};

/**
 * Parse location name from LocationContent or page
 * Location is typically in the LocationContent or page title/heading
 */
const parseLocation = (locationElement: HTMLElement | null): string => {
  if (!locationElement) {
    return '';
  }

  // Try to find location in LocationContent
  // Format: "You are attacking a {monster} {level} at {location}."
  const locationText = locationElement.textContent || '';

  // Primary pattern: "...at {location}."
  const atPattern = /\bat\s+([A-Z][a-zA-Z\s]+?)(?:\.|$)/i;
  const atMatch = locationText.match(atPattern);
  if (atMatch && atMatch[1]) {
    const location = atMatch[1].trim();
    // Filter out common false positives
    if (
      location.length > 2 &&
      !location.toLowerCase().includes('level') &&
      !location.toLowerCase().includes('exp') &&
      !location.toLowerCase().includes('hp') &&
      !location.toLowerCase().includes('fighting') &&
      !location.toLowerCase().includes('attacking')
    ) {
      return location;
    }
  }

  // Fallback patterns: "Location: [Name]", "In [Name]"
  const locationPatterns = [
    /(?:location|in):\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
    /(?:location|in)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|\.|,)/i,
  ];

  for (let i = 0; i < locationPatterns.length; i++) {
    const pattern = locationPatterns[i];
    const match = locationText.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Filter out common false positives
      if (
        location.length > 2 &&
        !location.toLowerCase().includes('level') &&
        !location.toLowerCase().includes('exp') &&
        !location.toLowerCase().includes('hp') &&
        !location.toLowerCase().includes('fighting') &&
        !location.toLowerCase().includes('attacking')
      ) {
        return location;
      }
    }
  }

  // Try to find location in page heading or title
  const heading = document.querySelector('h1, h2, .location, #location') as HTMLElement | null;
  if (heading) {
    const headingText = heading.textContent || '';
    if (headingText.trim().length > 0 && headingText.length < 100) {
      return headingText.trim();
    }
  }

  return '';
};

/**
 * Get all fight text from table rows following fightLogTop
 * Collects text from all <td align="center"> elements in subsequent <tr> rows
 */
const getAllFightText = (): string => {
  const fightLogTopMarker = document.querySelector('#fightLogTop') as HTMLElement | null;
  if (!fightLogTopMarker) {
    return '';
  }

  // Get all following sibling <tr> elements
  const allFightText: string[] = [];
  let currentSibling = fightLogTopMarker.nextElementSibling;

  while (currentSibling) {
    if (currentSibling.tagName === 'TR') {
      // Find all <td align="center"> elements in this row
      const centerCells = currentSibling.querySelectorAll('td[align="center"]');
      centerCells.forEach(cell => {
        const text = cell.textContent?.trim() || '';
        if (text) {
          allFightText.push(text);
        }
      });
    }
    currentSibling = currentSibling.nextElementSibling;
  }

  return allFightText.join(' ');
};

/**
 * Parse all damage dealt and received from fightLogTop
 * Returns arrays of all damage values found
 * Examples:
 * - Damage dealt: "You struck and dealt 23 damage to the Rima General."
 * - Damage received: "The Rima General struck at you and did 3 damage"
 * - Misses: "You struck at the rima general and missed!" (stored as "0")
 */
const parseDamage = (): { dealt: string[]; received: string[] } => {
  const fightText = getAllFightText();

  if (!fightText) {
    return { dealt: [], received: [] };
  }

  const damageDealt: string[] = [];
  const damageReceived: string[] = [];

  // Pattern for damage dealt: "You struck and dealt X damage"
  // Use global flag to find all matches
  const dealtPattern = /you\s+struck\s+and\s+dealt\s+(\d+)\s+damage/gi;
  const dealtMatches = [...fightText.matchAll(dealtPattern)];

  dealtMatches.forEach(match => {
    if (match && match[1]) {
      damageDealt.push(match[1]);
    }
  });

  // Check for misses: "You struck at the [monster] and missed!"
  // Store misses as "0" in the array
  const missPattern = /you\s+struck\s+at\s+(?:the\s+)?[A-Z][a-zA-Z\s]+?\s+and\s+missed/gi;
  const missMatches = [...fightText.matchAll(missPattern)];

  missMatches.forEach(() => {
    damageDealt.push('0');
  });

  // Pattern for damage received: "The [Monster] struck at you and did X damage"
  // Use global flag to find all matches
  const receivedPattern = /(?:the\s+)?[A-Z][a-zA-Z\s]+?\s+struck\s+(?:at\s+)?you\s+and\s+did\s+(\d+)\s+damage/gi;
  const receivedMatches = [...fightText.matchAll(receivedPattern)];

  receivedMatches.forEach(match => {
    if (match && match[1]) {
      damageReceived.push(match[1]);
    }
  });

  return { dealt: damageDealt, received: damageReceived };
};

/**
 * Parse drops from fightLogTop element
 * Drops are typically in yellow font elements
 */
const parseDrops = (fightLogElement: HTMLElement | null): string[] => {
  if (!fightLogElement) return [];

  const drops: string[] = [];

  // Find all yellow font elements (drops)
  const fontElements = fightLogElement.querySelectorAll('font[color]');
  const yellowFontElements = Array.from(fontElements).filter(font => {
    const color = font.getAttribute('color')?.toLowerCase();
    return color === 'yellow';
  });

  // Extract drop text from yellow font elements
  yellowFontElements.forEach(font => {
    const dropText = font.textContent?.trim();

    if (dropText) {
      // Keep the full drop text including amounts (e.g., "5 Gold", "3 Pear Seeds")
      // This allows us to track both the count of drops and their total amounts
      const cleanDrop = dropText.trim();

      if (cleanDrop && !cleanDrop.toLowerCase().includes('experience')) {
        drops.push(cleanDrop);
      }
    }
  });

  // Also check text patterns for drops (fallback)
  const text = fightLogElement.textContent || '';
  const dropPatterns = [/(?:got|received|obtained)\s+([^.!?]+?)(?:\.|$)/gi];

  dropPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const drop = match[1]?.trim();
      // Filter out experience-related text and pure numbers
      if (drop && !drop.toLowerCase().includes('experience') && !drop.match(/^\d+$/)) {
        // Check if it's not already in our drops list
        if (!drops.some(existing => existing.toLowerCase() === drop.toLowerCase())) {
          drops.push(drop);
        }
      }
    }
  });

  return [...new Set(drops)]; // Remove duplicates
};

export const scrapeScreenData = (): ScreenData => {
  const textContent = {
    currentActionText: '',
    exp: '',
    speedText: '',
    addExp: '',
    skillLevel: '',
    expForNextLevel: '',
    inventory: {
      hp: '',
      farmingExp: '',
    },
    combatExp: [] as CombatExpGain[],
    drops: [] as string[],
  };

  // const currentActionTextNode = document.body.querySelector('#centerContent')?.textContent;
  const combatActionTextNode = document.body.querySelector('#LocationContent')?.textContent;
  // const speedTextNode = document.body.querySelector('#SpeedDisplayTD')?.textContent;

  // Find fightLogTop - it's an empty <tr> that closes, and the actual content is in the NEXT <tr> sibling
  let addExpTextNode: HTMLElement | null = null;
  const fightLogTopMarker = document.querySelector('#fightLogTop') as HTMLElement | null;

  if (fightLogTopMarker) {
    // The content is in the next sibling <tr> element
    let nextSibling = fightLogTopMarker.nextElementSibling;
    while (nextSibling) {
      if (nextSibling.tagName === 'TR') {
        addExpTextNode = nextSibling as HTMLElement;
        break;
      }
      nextSibling = nextSibling.nextElementSibling;
    }
  }

  // Fallback: try finding it directly (in case structure is different)
  if (!addExpTextNode) {
    addExpTextNode = document.querySelector('#fightLogTop') as HTMLElement | null;
  }
  if (!addExpTextNode) {
    // Try finding it in a table
    const table = document.querySelector('table');
    if (table) {
      const marker = table.querySelector('#fightLogTop') as HTMLElement | null;
      if (marker) {
        let nextSibling = marker.nextElementSibling;
        while (nextSibling) {
          if (nextSibling.tagName === 'TR') {
            addExpTextNode = nextSibling as HTMLElement;
            break;
          }
          nextSibling = nextSibling.nextElementSibling;
        }
      }
    }
  }

  const inventoryTextNode = document.body.querySelector('#inventoryStats')?.textContent;
  const locationElement = document.body.querySelector('#LocationContent') as HTMLElement | null;

  // Parse monster and location
  const monster = parseMonster(locationElement, addExpTextNode);
  const location = parseLocation(locationElement);

  // Initialize damage arrays - only populate when combat exp is found
  let damage = { dealt: [] as string[], received: [] as string[] };

  const combatText = combatActionTextNode?.trim();
  if (combatText) {
    const skillInfo = matchText(combatText);
    textContent.exp = skillInfo.exp;
    textContent.currentActionText = skillInfo.skill;
    textContent.skillLevel = skillInfo.level;
    textContent.expForNextLevel = skillInfo.expForNextLevel;
    // textContent.speedText = speedTextNode?.trim() || "";

    // Get addExp text but filter out timer text (numbers, colons, dashes in timer format)
    let addExpText = addExpTextNode?.textContent || '';
    // Remove timer patterns (e.g., "00:05", "5s", countdown numbers)
    addExpText = addExpText.replace(/\b[\d:]+[smh]?\b/g, '').trim();
    // Remove standalone number sequences that look like timers
    addExpText = addExpText.replace(/^\d+[:]\d+$/gm, '').trim();
    textContent.addExp = addExpText;
  }

  // Parse combat experience gains from fightLogTop
  if (addExpTextNode) {
    textContent.combatExp = parseCombatExp(addExpTextNode);
    textContent.drops = parseDrops(addExpTextNode);

    const fightText = addExpTextNode.textContent || '';
    const hasDefeatedText = /you\s+defeated/i.test(fightText);

    // ONLY parse damage when "You defeated" text is present (fight just finished)
    if (hasDefeatedText) {
      damage = parseDamage();
      console.log('[FIGHT ENDED] LocationContent element:', locationElement);
    }
  }

  // Parse inventory stats
  if (inventoryTextNode) {
    const inventoryText = inventoryTextNode.trim();

    // Parse HP: matches "HP: 77,565" or "HP:77565"
    const hpMatch = inventoryText.match(/HP:\s*([\d,]+)/i);
    if (hpMatch) {
      textContent.inventory.hp = hpMatch[1];
    }

    // Parse Farming exp: matches "Farming exp: 20" or variations
    const farmingExpMatch = inventoryText.match(/Farming\s+exp:\s*([\d,]+)/i);
    if (farmingExpMatch) {
      textContent.inventory.farmingExp = farmingExpMatch[1];
    }
  }

  // Get all visible images
  // const equipment = document.body.querySelector("#wearDisplayTD");

  return {
    actionText: textContent,
    images: [],
    links: [],
    timestamp: new Date().toISOString(),
    monster: monster,
    location: location,
    damageDealt: damage.dealt,
    damageReceived: damage.received,
  };
};
