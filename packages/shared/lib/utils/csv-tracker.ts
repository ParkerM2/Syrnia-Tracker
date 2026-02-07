/* eslint-disable import-x/exports-last */
import type { ScreenData } from './types.js';

export interface CSVRow {
  timestamp: string;
  uuid: string; // Unique identifier for this screen scrape (UUID v4)
  skill: string;
  skillLevel: string;
  expForNextLevel: string;
  gainedExp: string; // The exp gained at this timestamp (calculated delta or combat exp value)
  drops: string; // Semicolon-separated list of drops
  hp: string; // Current HP value at this timestamp (deprecated, use totalInventoryHP)
  monster: string; // Name of the monster being fought
  location: string; // Location name where fighting
  damageDealt: string; // Semicolon-separated array of damage dealt by player
  damageReceived: string; // Semicolon-separated array of damage received by player
  peopleFighting: string; // Number of people fighting at the location (empty string if not available)
  totalFights: string; // Total number of fights completed (empty string if not available)
  totalInventoryHP: string; // Current HP value from inventory (empty string if not available)
  hpUsed: string; // HP used from fight log (parsed from "gained X HP" lines, empty string if not available)
  equipment: string; // Equipment data as JSON string (empty string if not available)
  combatExp: string; // All combat exp gains as JSON string: [{"skill":"Strength","exp":"27"},...] (empty string if not available)
}

/**
 * Convert ScreenData to CSV row format
 * Returns a single row with all data from the screen scrape, including all combat exp gains
 * Note: gainedExp will be calculated when saving (in appendToCSV)
 */
export const screenDataToCSVRows = (data: ScreenData): CSVRow[] => {
  // Create a single row with all the data from the screen scrape
  const row: CSVRow = {
    timestamp: data.timestamp,
    uuid: data.uuid,
    skill: data.actionText.currentActionText || '',
    skillLevel: data.actionText.skillLevel || '',
    expForNextLevel: data.actionText.expForNextLevel || '',
    gainedExp: '', // Will be calculated when saving
    drops: data.actionText.drops.join(';'),
    hp: data.actionText.inventory.hp || '',
    monster: data.monster || '',
    location: data.location || '',
    damageDealt: (data.damageDealt || []).join(';'),
    damageReceived: (data.damageReceived || []).join(';'),
    peopleFighting:
      data.peopleFighting !== null && data.peopleFighting !== undefined ? String(data.peopleFighting) : '',
    totalFights: data.totalFights !== null && data.totalFights !== undefined ? String(data.totalFights) : '',
    totalInventoryHP: data.totalInventoryHP || '',
    hpUsed: data.hpUsed !== null && data.hpUsed !== undefined ? String(data.hpUsed) : '',
    equipment: data.equipment ? JSON.stringify(data.equipment) : '',
    combatExp:
      data.actionText.combatExp && data.actionText.combatExp.length > 0
        ? JSON.stringify(data.actionText.combatExp)
        : '',
  };

  return [row];
};

/**
 * Convert CSV row to object
 */
export const csvRowToObject = (row: string[]): CSVRow | null => {
  // Backward compatible: handle different CSV format versions
  if (row.length < 2) return null;

  // Format versions:
  // New with UUID (16 fields): timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed
  // New with UUID and equipment (17 fields): timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed,equipment
  // New with UUID, equipment, and combatExp (18 fields): timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed,equipment,combatExp

  // Check for 18 fields first - new format with UUID, equipment, and combatExp
  const isNewFormatWithUUIDAndEquipmentAndCombatExp = row.length === 18;
  // Check for 17 fields - new format with UUID and equipment
  const isNewFormatWithUUIDAndEquipment = row.length === 17;
  // Check for 16 fields - new format with UUID
  const isNewFormatWithUUID = row.length === 16;
  // Check for 15 fields - new format with all fields including totalInventoryHP and hpUsed (but no UUID)
  const isNewFormatWithHpFields = row.length === 15;
  // Check for 13 fields - new format with all fields including totalFights
  const isNewFormatWithTotalFights = row.length === 13;
  // Check for 12 fields - new format with all fields including peopleFighting (but not totalFights)
  const isNewFormatWithPeople = row.length === 12;
  // Check for 11 fields - need to distinguish between old new format and new format with combat
  // Old new format: row[7] is gainedExp (number), row[8] is drops (string), row[9] is images, row[10] is links
  // New format with combat: row[7] is monster (string, not a number), row[8] is location, row[9] is damageDealt, row[10] is damageReceived
  const isNewFormatWithCombat = row.length === 11 && row[7] && !row[7].match(/^[\d,]+$/); // 8th field is monster (not a number)
  const isOldNewFormat =
    row.length === 11 && !isNewFormatWithCombat && row[7] && /^[\d,]+$/.test(row[7].replace(/,/g, '')); // 8th field is gainedExp (number)

  const isNewFormat = row.length === 6;
  const isMediumFormat = row.length === 9;

  // For 7 fields, need to distinguish between old format and new format with HP
  // Old format: timestamp,skill,exp,speedText,addExp,images,links
  // New format with HP: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp
  // Heuristic: if row[2] (3rd field) is a number and row[3] (4th field) is not empty and looks like expForNextLevel (number), it's new format
  const isNewFormatWithHP = row.length === 7 && row[3] && /^\d+$/.test(row[3].replace(/,/g, '')); // expForNextLevel is a number
  const isOldFormat = row.length === 7 && !isNewFormatWithHP;

  if (isNewFormatWithUUIDAndEquipmentAndCombatExp) {
    // New format with UUID, equipment, and combatExp: timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed,equipment,combatExp
    return {
      timestamp: row[0] || '',
      uuid: row[1] || '',
      skill: row[2] || '',
      skillLevel: row[3] || '',
      expForNextLevel: row[4] || '',
      gainedExp: row[5] || '',
      drops: row[6] || '',
      hp: row[7] || '',
      monster: row[8] || '',
      location: row[9] || '',
      damageDealt: row[10] || '',
      damageReceived: row[11] || '',
      peopleFighting: row[12] || '',
      totalFights: row[13] || '',
      totalInventoryHP: row[14] || '',
      hpUsed: row[15] || '',
      equipment: row[16] || '',
      combatExp: row[17] || '',
    };
  } else if (isNewFormatWithUUIDAndEquipment) {
    // New format with UUID and equipment: timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed,equipment
    return {
      timestamp: row[0] || '',
      uuid: row[1] || '',
      skill: row[2] || '',
      skillLevel: row[3] || '',
      expForNextLevel: row[4] || '',
      gainedExp: row[5] || '',
      drops: row[6] || '',
      hp: row[7] || '',
      monster: row[8] || '',
      location: row[9] || '',
      damageDealt: row[10] || '',
      damageReceived: row[11] || '',
      peopleFighting: row[12] || '',
      totalFights: row[13] || '',
      totalInventoryHP: row[14] || '',
      hpUsed: row[15] || '',
      equipment: row[16] || '',
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  }

  if (isNewFormatWithUUID) {
    // New format with UUID: timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed
    return {
      timestamp: row[0] || '',
      uuid: row[1] || '',
      skill: row[2] || '',
      skillLevel: row[3] || '',
      expForNextLevel: row[4] || '',
      gainedExp: row[5] || '',
      drops: row[6] || '',
      hp: row[7] || '',
      monster: row[8] || '',
      location: row[9] || '',
      damageDealt: row[10] || '',
      damageReceived: row[11] || '',
      peopleFighting: row[12] || '',
      totalFights: row[13] || '',
      totalInventoryHP: row[14] || '',
      hpUsed: row[15] || '',
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  }

  if (isNewFormatWithHpFields) {
    // New format with HP, combat, people, totalFights, totalInventoryHP, and hpUsed (no UUID): timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: row[6] || '',
      monster: row[7] || '',
      location: row[8] || '',
      damageDealt: row[9] || '',
      damageReceived: row[10] || '',
      peopleFighting: row[11] || '',
      totalFights: row[12] || '',
      totalInventoryHP: row[13] || '',
      hpUsed: row[14] || '',
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  }

  if (isNewFormatWithTotalFights) {
    // New format with HP, combat, people, and totalFights: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: row[6] || '',
      monster: row[7] || '',
      location: row[8] || '',
      damageDealt: row[9] || '',
      damageReceived: row[10] || '',
      peopleFighting: row[11] || '',
      totalFights: row[12] || '',
      totalInventoryHP: '', // Backward compatible: not available in old format
      hpUsed: '', // Backward compatible: not available in old format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  }

  if (isNewFormatWithPeople) {
    // New format with HP, combat, and people: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: row[6] || '',
      monster: row[7] || '',
      location: row[8] || '',
      damageDealt: row[9] || '',
      damageReceived: row[10] || '',
      peopleFighting: row[11] || '',
      totalFights: '', // Backward compatible: no totalFights in old format
      totalInventoryHP: '', // Backward compatible: not available in old format
      hpUsed: '', // Backward compatible: not available in old format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isNewFormatWithCombat) {
    // New format with HP and combat: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: row[6] || '',
      monster: row[7] || '',
      location: row[8] || '',
      damageDealt: row[9] || '',
      damageReceived: row[10] || '',
      peopleFighting: '', // Not available in this format
      totalFights: '', // Not available in this format
      totalInventoryHP: '', // Not available in this format
      hpUsed: '', // Not available in this format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isNewFormatWithHP) {
    // New format with HP: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: row[6] || '',
      monster: '', // Not available in this format
      location: '', // Not available in this format
      damageDealt: '', // Not available in this format
      damageReceived: '', // Not available in this format
      peopleFighting: '', // Not available in this format
      totalFights: '', // Not available in this format
      totalInventoryHP: '', // Not available in this format
      hpUsed: '', // Not available in this format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isNewFormat) {
    // New format: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[2] || '',
      expForNextLevel: row[3] || '',
      gainedExp: row[4] || '',
      drops: row[5] || '',
      hp: '', // HP not available in old format
      monster: '', // Not available in this format
      location: '', // Not available in this format
      damageDealt: '', // Not available in this format
      damageReceived: '', // Not available in this format
      peopleFighting: '', // Not available in this format
      totalFights: '', // Not available in this format
      totalInventoryHP: '', // Not available in this format
      hpUsed: '', // Not available in this format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isOldNewFormat) {
    // Old new format (11 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,gainedExp,drops,images,links
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[5] || '',
      expForNextLevel: row[6] || '',
      gainedExp: row[7] || '',
      drops: row[8] || '',
      hp: '', // HP not available in old format
      monster: '', // Not available in old format
      location: '', // Not available in old format
      damageDealt: '', // Not available in old format
      damageReceived: '', // Not available in old format
      peopleFighting: '', // Not available in old format
      totalFights: '', // Not available in old format
      totalInventoryHP: '', // Not available in old format
      hpUsed: '', // Not available in old format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isMediumFormat) {
    // Medium format (9 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,images,links
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: row[5] || '',
      expForNextLevel: row[6] || '',
      gainedExp: '', // Not available in this format
      drops: '', // Not available in this format
      hp: '', // HP not available in old format
      monster: '', // Not available in old format
      location: '', // Not available in old format
      damageDealt: '', // Not available in old format
      damageReceived: '', // Not available in old format
      peopleFighting: '', // Not available in old format
      totalFights: '', // Not available in old format
      totalInventoryHP: '', // Not available in old format
      hpUsed: '', // Not available in old format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  } else if (isOldFormat) {
    // Old format (7 fields): timestamp,skill,exp,speedText,addExp,images,links
    return {
      timestamp: row[0] || '',
      uuid: '', // Backward compatible: no UUID in old format
      skill: row[1] || '',
      skillLevel: '', // Not available in this format
      expForNextLevel: '', // Not available in this format
      gainedExp: '', // Not available in this format
      drops: '', // Not available in this format
      hp: '', // HP not available in old format
      monster: '', // Not available in old format
      location: '', // Not available in old format
      damageDealt: '', // Not available in old format
      damageReceived: '', // Not available in old format
      peopleFighting: '', // Not available in old format
      totalFights: '', // Not available in old format
      totalInventoryHP: '', // Not available in old format
      hpUsed: '', // Not available in old format
      equipment: '', // Backward compatible: no equipment in old format
      combatExp: '', // Backward compatible: no combatExp in old format
    };
  }

  // Unknown format, try to extract what we can
  // Always return a complete CSVRow object with all fields
  const result: CSVRow = {
    timestamp: row[0] || '',
    uuid: row[1] || '', // Try to get UUID if available (may be empty for old formats)
    skill: row[2] || row[1] || '', // Try row[2] first (new format), fallback to row[1] (old format)
    skillLevel: row[3] || row[2] || '',
    expForNextLevel: row[4] || row[3] || '',
    gainedExp: row[5] || row[4] || '',
    drops: row[6] || row[5] || '',
    hp: row[7] || row[6] || '', // Try to get HP if available
    monster: row[8] || row[7] || '', // Try to get monster if available
    location: row[9] || row[8] || '', // Try to get location if available
    damageDealt: row[10] || row[9] || '', // Try to get damageDealt if available
    damageReceived: row[11] || row[10] || '', // Try to get damageReceived if available
    peopleFighting: row[12] || row[11] || '', // Try to get peopleFighting if available
    totalFights: row[13] || row[12] || '', // Try to get totalFights if available
    totalInventoryHP: row[14] || row[13] || '', // Try to get totalInventoryHP if available
    hpUsed: row[15] || row[14] || '', // Try to get hpUsed if available
    equipment: row[16] || '', // Try to get equipment if available
    combatExp: row[17] || '', // Try to get combatExp if available
  };
  return result;
};

/**
 * Escape CSV field (handles commas, quotes, newlines)
 */
const escapeCSVField = (field: string | undefined | null): string => {
  const safeField = field || '';
  if (safeField.includes(',') || safeField.includes('"') || safeField.includes('\n')) {
    return `"${safeField.replace(/"/g, '""')}"`;
  }
  return safeField;
};

/**
 * Convert CSV row object to CSV string
 */
export const csvRowToString = (row: CSVRow): string =>
  [
    escapeCSVField(row.timestamp),
    escapeCSVField(row.uuid),
    escapeCSVField(row.skill),
    escapeCSVField(row.skillLevel),
    escapeCSVField(row.expForNextLevel),
    escapeCSVField(row.gainedExp),
    escapeCSVField(row.drops),
    escapeCSVField(row.hp),
    escapeCSVField(row.monster),
    escapeCSVField(row.location),
    escapeCSVField(row.damageDealt),
    escapeCSVField(row.damageReceived),
    escapeCSVField(row.peopleFighting),
    escapeCSVField(row.totalFights),
    escapeCSVField(row.totalInventoryHP),
    escapeCSVField(row.hpUsed),
    escapeCSVField(row.equipment),
    escapeCSVField(row.combatExp),
  ].join(',');

/**
 * Get CSV header row
 */
export const getCSVHeader = (): string =>
  'timestamp,uuid,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived,peopleFighting,totalFights,totalInventoryHP,hpUsed,equipment,combatExp';

/**
 * Parse CSV content to array of CSVRow objects
 */
export const parseCSV = (csvContent: string): CSVRow[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines
    .map(line => {
      // Simple CSV parsing (handles quoted fields)
      const row: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current); // Add last field

      return csvRowToObject(row);
    })
    .filter((row): row is CSVRow => row !== null);
};

/**
 * Time period types for filtering
 */
export type TimePeriod = 'hour' | 'day' | 'week' | 'month';

/**
 * Filter CSV rows by time period
 */
export const filterByTimePeriod = (rows: CSVRow[], period: TimePeriod, referenceDate?: Date): CSVRow[] => {
  const refDate = referenceDate || new Date();
  const now = refDate.getTime();

  let startTime: number;

  switch (period) {
    case 'hour':
      startTime = now - 60 * 60 * 1000; // 1 hour ago
      break;
    case 'day':
      startTime = now - 24 * 60 * 60 * 1000; // 24 hours ago
      break;
    case 'week':
      startTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      break;
    case 'month':
      // Approximate month as 30 days
      startTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      break;
    default:
      return rows;
  }

  return rows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    return rowTime >= startTime && rowTime <= now;
  });
};

/**
 * Get data for specific hour (0-23)
 */
export const filterByHour = (rows: CSVRow[], hour: number, date?: Date): CSVRow[] => {
  const refDate = date || new Date();
  const year = refDate.getUTCFullYear();
  const month = refDate.getUTCMonth();
  const day = refDate.getUTCDate();
  const startTime = Date.UTC(year, month, day, hour, 0, 0, 0);
  const endTime = startTime + 60 * 60 * 1000;

  return rows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    return rowTime >= startTime && rowTime < endTime;
  });
};

/**
 * Get data for specific day
 */
export const filterByDay = (rows: CSVRow[], date: Date): CSVRow[] => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const startTime = Date.UTC(year, month, day, 0, 0, 0, 0);
  const endTime = Date.UTC(year, month, day, 23, 59, 59, 999);

  return rows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    return rowTime >= startTime && rowTime <= endTime;
  });
};

/**
 * Aggregate statistics from CSV rows
 */
export interface TrackedStats {
  totalEntries: number;
  totalExp: number;
  skills: Record<string, number>; // skill -> total exp
  timeRange: {
    start: string;
    end: string;
  };
}

export const aggregateStats = (rows: CSVRow[]): TrackedStats => {
  if (rows.length === 0) {
    return {
      totalEntries: 0,
      totalExp: 0,
      skills: {},
      timeRange: {
        start: '',
        end: '',
      },
    };
  }

  const timestamps = rows.map(r => new Date(r.timestamp).getTime()).sort((a, b) => a - b);
  const skills: Record<string, number> = {};
  const totalGainedExp = 0;

  // Sort rows by timestamp and skill
  const sortedRows = [...rows].sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.skill || '').localeCompare(b.skill || '');
  });

  // Deduplicate entries: one entry per timestamp+skill (keep the one with highest gainedExp or most complete data)
  const uniqueEntriesMap = new Map<string, CSVRow>();

  sortedRows.forEach(row => {
    const skill = row.skill || '';
    const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

    // Deduplicate by timestamp+skill
    const key = `${row.timestamp}-${skill}`;
    const existing = uniqueEntriesMap.get(key);

    if (!existing) {
      // No existing entry, add this one
      uniqueEntriesMap.set(key, row);
    } else {
      // Entry exists - keep the one with higher gainedExp or more complete data
      const existingGainedExp = parseInt(existing.gainedExp || '0', 10) || 0;
      if (gainedExp > existingGainedExp || (gainedExp === existingGainedExp && row.skillLevel)) {
        uniqueEntriesMap.set(key, row);
      }
    }
  });

  // Process unique entries to calculate totals
  const uniqueEntries = Array.from(uniqueEntriesMap.values());

  uniqueEntries.forEach(row => {
    const skill = row.skill || '';
    const gainedExp = parseInt(row.gainedExp || '0', 10) || 0;

    // Only count entries with gained exp > 0
    if (gainedExp > 0) {
      if (skill) {
        skills[skill] = (skills[skill] || 0) + gainedExp;
      }
    }
  });

  return {
    totalEntries: uniqueEntries.filter(row => parseInt(row.gainedExp || '0', 10) > 0).length,
    totalExp: totalGainedExp, // This is actually total gained exp, not total exp
    skills,
    timeRange: {
      start: new Date(timestamps[0]).toISOString(),
      end: new Date(timestamps[timestamps.length - 1]).toISOString(),
    },
  };
};
