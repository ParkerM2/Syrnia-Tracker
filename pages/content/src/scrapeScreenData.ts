import { matchText, skillExpRegex } from '@extension/shared';
import { v4 as uuidv4 } from 'uuid';
import type { ScreenData, CombatExpGain, EquipmentData, EquipmentItem } from '@extension/shared';

// Track last processed fight to prevent duplicate wearDisplayTD collection
let lastProcessedFightText: string | null = null;

// Cache location - only parse once at fight end
let cachedLocation: string = '';

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
  // Try fightLogTop first - format: "You defeated {monster}." or "The {monster} died. You got"
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

    // Secondary pattern: "The {monster} died. You got"
    const diedPattern = /the\s+(.+?)\s+died\.\s+you\s+got/i;
    const diedMatch = fightText.match(diedPattern);
    if (diedMatch && diedMatch[1]) {
      const monster = diedMatch[1].trim();
      // Filter out common false positives
      if (
        monster.length > 2 &&
        !monster.toLowerCase().includes('level') &&
        !monster.toLowerCase().includes('exp') &&
        !monster.toLowerCase().includes('damage')
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
  // Example: "You are attacking a Rima General (80) at Rima city - barracks."
  const locationText = locationElement.textContent || '';

  // Primary pattern: "...at {location}." - capture everything after "at" up to the period
  // This should match: "at Rima city - barracks." -> "Rima city - barracks"
  const atPattern = /\bat\s+([^.]+?)(?:\.|$)/i;
  const atMatch = locationText.match(atPattern);
  if (atMatch && atMatch[1]) {
    let location = atMatch[1].trim();

    // Clean up any trailing whitespace or punctuation
    location = location.replace(/[.,;:]+$/, '').trim();

    // Filter out common false positives
    if (
      location.length > 2 &&
      !location.toLowerCase().includes('level') &&
      !location.toLowerCase().includes('exp') &&
      !location.toLowerCase().includes('hp') &&
      !location.toLowerCase().includes('fighting') &&
      !location.toLowerCase().includes('attacking') &&
      !location.toLowerCase().includes('you are') &&
      !location.toLowerCase().includes("you're")
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
 * Parse number of people fighting at location
 * Looks for text like "There are X people fighting here"
 */
const parsePeopleFighting = (
  locationElement: HTMLElement | null,
  fightLogElement: HTMLElement | null,
): number | null => {
  // Check LocationContent first
  if (locationElement) {
    const locationText = locationElement.textContent || '';
    const peopleMatch = locationText.match(/there\s+are\s+(\d+)\s+people\s+fighting\s+here/i);
    if (peopleMatch && peopleMatch[1]) {
      const count = parseInt(peopleMatch[1], 10);
      if (!isNaN(count)) {
        return count;
      }
    }
  }

  // Check fight log element
  if (fightLogElement) {
    const fightText = fightLogElement.textContent || '';
    const peopleMatch = fightText.match(/there\s+are\s+(\d+)\s+people\s+fighting\s+here/i);
    if (peopleMatch && peopleMatch[1]) {
      const count = parseInt(peopleMatch[1], 10);
      if (!isNaN(count)) {
        return count;
      }
    }
  }

  return null;
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

/**
 * Parse equipment from wearDisplayTD table
 * Extracts armor pieces, weapon, stats, enchants, and image URLs
 */
const parseEquipment = (): EquipmentData | undefined => {
  const wearDisplayTD = document.querySelector('#wearDisplayTD') as HTMLElement | null;
  if (!wearDisplayTD) {
    return undefined;
  }

  const equipment: EquipmentData = {
    totals: {},
  };

  // Slot mapping: id -> slot name
  const slotMap: Record<string, keyof EquipmentData> = {
    displayHelm: 'helm',
    displayShield: 'shield',
    displayBody: 'body',
    displayHand: 'weapon',
    displayLegs: 'legs',
    displayGloves: 'gloves',
    displayShoes: 'boots',
    displayHorse: 'horse',
    displayTrophy: 'trophy',
  };

  // Parse each equipment slot
  Object.entries(slotMap).forEach(([id, slot]) => {
    const element = wearDisplayTD.querySelector(`#${id}`) as HTMLElement | null;
    if (!element) return;

    // Extract image URL from style attribute
    let imageUrl: string | undefined;
    const style = element.getAttribute('style') || '';
    const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
    if (urlMatch && urlMatch[1]) {
      imageUrl = urlMatch[1];
    }

    // Extract title (contains name and enchant/stats)
    const title = element.getAttribute('title') || '';

    // Extract text content (stats numbers like "40", "55", "167/160")
    // textContent property automatically excludes HTML tags, giving us just the text
    const textContent = element.textContent?.trim() || '';

    // Parse title format: "Dragon helm [4 Aim]" or "Novariet scimitar [0 Durability]"
    // Title format: "Item Name [Enchant/Stats]"
    let name = title;
    let enchant: string | undefined;
    let stats: string | undefined;

    // Extract name and bracket content from title
    const titleMatch = title.match(/^(.+?)(?:\s+\[(.+?)\])?$/);
    if (titleMatch) {
      name = titleMatch[1].trim();
      if (titleMatch[2]) {
        const bracketContent = titleMatch[2];
        // Check if it's an enchant (contains "Aim", "Power", "Armour", "Travel Time")
        if (/\d+\s+(?:Aim|Power|Armour|Travel\s+Time)/i.test(bracketContent)) {
          enchant = bracketContent;
        } else {
          // Other stats like durability
          stats = bracketContent;
        }
      }
    }

    // Use text content as stats (the numbers displayed in the cell)
    // Format: "40" or "167/160" (numbers before image)
    if (textContent) {
      // Extract numbers and slashes (for durability like "167/160")
      // Match pattern: numbers, optionally with slash and more numbers
      const statsMatch = textContent.match(/^([\d/]+)/);
      if (statsMatch && statsMatch[1]) {
        stats = statsMatch[1].trim();
      } else {
        // Fallback: extract all numbers and slashes
        const cleanStats = textContent.replace(/[^\d/]/g, '').trim();
        if (cleanStats) {
          stats = cleanStats;
        }
      }
    }

    const item: EquipmentItem = {
      slot: slot as string,
      name,
      title,
      imageUrl,
    };

    if (stats) item.stats = stats;
    if (enchant) item.enchant = enchant;

    equipment[slot] = item;
  });

  // Calculate totals
  // Try to find totals in specific elements
  const bodyText = document.body.textContent || '';

  // Look for patterns like "Total Armour: 123" or "Armour: 123" or "Armour 123"
  const armourMatch = bodyText.match(/(?:total\s+)?armour[:\s]+(\d+)/i);
  if (armourMatch) {
    equipment.totals.armour = parseInt(armourMatch[1], 10);
  }

  const aimMatch = bodyText.match(/(?:total\s+)?aim[:\s]+(\d+)/i);
  if (aimMatch) {
    equipment.totals.aim = parseInt(aimMatch[1], 10);
  }

  const powerMatch = bodyText.match(/(?:total\s+)?power[:\s]+(\d+)/i);
  if (powerMatch) {
    equipment.totals.power = parseInt(powerMatch[1], 10);
  }

  const travelTimeMatch = bodyText.match(/(?:total\s+)?travel\s+time[:\s]+(\d+)/i);
  if (travelTimeMatch) {
    equipment.totals.travelTime = parseInt(travelTimeMatch[1], 10);
  }

  // If totals not found in body text, calculate from equipment enchants
  // Sum up Aim, Power, Armour from equipment enchants
  let totalAim = 0;
  let totalPower = 0;
  let totalArmour = 0;
  let totalTravelTime = 0;

  Object.values(equipment).forEach(item => {
    if (item && typeof item === 'object' && 'enchant' in item && item.enchant) {
      const enchant = item.enchant;
      const aimMatch = enchant.match(/(\d+)\s+Aim/i);
      const powerMatch = enchant.match(/(\d+)\s+Power/i);
      const armourMatch = enchant.match(/(\d+)\s+Armour/i);
      const travelTimeMatch = enchant.match(/(\d+)\s+Travel\s+Time/i);

      if (aimMatch) totalAim += parseInt(aimMatch[1], 10);
      if (powerMatch) totalPower += parseInt(powerMatch[1], 10);
      if (armourMatch) totalArmour += parseInt(armourMatch[1], 10);
      if (travelTimeMatch) totalTravelTime += parseInt(travelTimeMatch[1], 10);
    }
  });

  // Use calculated totals if not found in page text
  if (!equipment.totals.aim && totalAim > 0) equipment.totals.aim = totalAim;
  if (!equipment.totals.power && totalPower > 0) equipment.totals.power = totalPower;
  if (!equipment.totals.armour && totalArmour > 0) equipment.totals.armour = totalArmour;
  if (!equipment.totals.travelTime && totalTravelTime > 0) equipment.totals.travelTime = totalTravelTime;

  return equipment;
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

  // Parse monster (always parse to detect new fights)
  const monster = parseMonster(locationElement, addExpTextNode);

  // Location will be parsed only at fight end (see below)
  let location = cachedLocation;

  const peopleFighting = parsePeopleFighting(locationElement, addExpTextNode);

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

  // Parse inventory stats
  let totalInventoryHP: string | undefined = undefined;
  if (inventoryTextNode) {
    const inventoryText = inventoryTextNode.trim();

    // Parse HP: matches "HP: 77,565" or "HP:77565"
    const hpMatch = inventoryText.match(/HP:\s*([\d,]+)/i);
    if (hpMatch) {
      textContent.inventory.hp = hpMatch[1];
      totalInventoryHP = hpMatch[1]; // Save as totalInventoryHP
    }

    // Parse Farming exp: matches "Farming exp: 20" or variations
    const farmingExpMatch = inventoryText.match(/Farming\s+exp:\s*([\d,]+)/i);
    if (farmingExpMatch) {
      textContent.inventory.farmingExp = farmingExpMatch[1];
    }
  }

  // Parse combat experience gains from fightLogTop
  let hpUsed: number | undefined = undefined;
  let equipment: EquipmentData | undefined = undefined;

  // Check for skill level information pattern: "Skill level: 132 (28080364 exp, 86538 for next level)"
  // This pattern indicates a fight has ended and skill info is displayed
  // Pattern allows any skill name, level number, exp values, and exp for next level
  let fightText = '';
  let hasSkillLevelInfo = false;

  // Regex pattern to match: "Skill level: number (number exp, number for next level)"
  const skillLevelPattern = /\w+\s+level:\s+\d+\s+\(\d+\s+exp,\s+\d+\s+for\s+next\s+level\)/i;

  if (addExpTextNode) {
    textContent.combatExp = parseCombatExp(addExpTextNode);
    textContent.drops = parseDrops(addExpTextNode);
    fightText = addExpTextNode.textContent || '';
    hasSkillLevelInfo = skillLevelPattern.test(fightText);
  }

  // Also check all fight log rows for skill level info (in case addExpTextNode doesn't contain it)
  if (!hasSkillLevelInfo) {
    const fightLogTopMarker = document.querySelector('#fightLogTop') as HTMLElement | null;
    if (fightLogTopMarker) {
      let currentSibling: Element | null = fightLogTopMarker.nextElementSibling;
      while (currentSibling) {
        if (currentSibling.tagName === 'TR') {
          const siblingText = currentSibling.textContent || '';
          if (skillLevelPattern.test(siblingText)) {
            fightText = siblingText;
            hasSkillLevelInfo = true;
            break;
          }
        }
        currentSibling = currentSibling.nextElementSibling;
      }
    }
  }

  // ONLY parse damage, HP, and equipment when skill level info is present (fight just finished)
  if (hasSkillLevelInfo) {
    // Check if this is the same fight text we already processed
    // This prevents re-processing while sitting at the same fight end screen
    if (fightText === lastProcessedFightText) {
      // Same fight screen, skip ALL fight-end processing
      // Use cached location and empty damage arrays
      location = cachedLocation;
    } else {
      // New fight detected - process it
      lastProcessedFightText = fightText;

      // Parse location only once at fight end
      location = parseLocation(locationElement);
      cachedLocation = location; // Cache for future calls

      damage = parseDamage();

      // Calculate HP Used from damage received (sum of all damage received values)
      if (damage.received && damage.received.length > 0) {
        hpUsed = damage.received.reduce((sum, dmg) => {
          const damageValue = parseInt(dmg, 10);
          return sum + (isNaN(damageValue) ? 0 : damageValue);
        }, 0);
      }

      // Parse equipment data (only once per fight)
      equipment = parseEquipment();
    }
  }

  // Get all visible images
  // const equipment = document.body.querySelector("#wearDisplayTD");

  return {
    actionText: textContent,
    images: [],
    links: [],
    timestamp: new Date().toISOString(),
    uuid: uuidv4(), // Generate unique identifier for this screen scrape
    monster: monster,
    location: location,
    damageDealt: damage.dealt,
    damageReceived: damage.received,
    peopleFighting: peopleFighting,
    totalInventoryHP: totalInventoryHP,
    hpUsed: hpUsed,
    equipment: equipment,
  };
};
