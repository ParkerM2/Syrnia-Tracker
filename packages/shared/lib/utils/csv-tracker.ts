/* eslint-disable import-x/exports-last */
import type { ScreenData } from './types.js';

export interface CSVRow {
  timestamp: string;
  skill: string;
  skillLevel: string;
  expForNextLevel: string;
  gainedExp: string; // The exp gained at this timestamp (calculated delta or combat exp value)
  drops: string; // Semicolon-separated list of drops
  hp: string; // Current HP value at this timestamp
  monster: string; // Name of the monster being fought
  location: string; // Location name where fighting
  damageDealt: string; // Semicolon-separated array of damage dealt by player
  damageReceived: string; // Semicolon-separated array of damage received by player
}

/**
 * Convert ScreenData to CSV row format
 * Returns array of rows - one for main skill, plus one for each combatExp gain
 * Note: gainedExp will be calculated when saving (in appendToCSV)
 */
export const screenDataToCSVRows = (data: ScreenData): CSVRow[] => {
  const rows: CSVRow[] = [];

  // Main skill row (from LocationContent)
  if (data.actionText.currentActionText || data.actionText.exp) {
    rows.push({
      timestamp: data.timestamp,
      skill: data.actionText.currentActionText || '',
      skillLevel: data.actionText.skillLevel || '',
      expForNextLevel: data.actionText.expForNextLevel || '',
      gainedExp: '', // Will be calculated when saving
      drops: data.actionText.drops.join(';'), // Save all drops
      hp: data.actionText.inventory.hp || '', // Save HP
      monster: data.monster || '',
      location: data.location || '',
      damageDealt: (data.damageDealt || []).join(';'), // Save all damage dealt as semicolon-separated
      damageReceived: (data.damageReceived || []).join(';'), // Save all damage received as semicolon-separated
    });
  }

  // Combat exp gain rows (from fight results)
  // For combat exp, the exp value IS the gained exp
  data.actionText.combatExp.forEach(combatExp => {
    rows.push({
      timestamp: data.timestamp,
      skill: combatExp.skill,
      skillLevel: combatExp.skillLevel || '',
      expForNextLevel: combatExp.expForNextLevel || '',
      gainedExp: combatExp.exp, // For combat exp, the exp value IS the gained exp
      drops: '', // Combat exp rows don't have drops
      hp: data.actionText.inventory.hp || '', // Save HP
      monster: data.monster || '',
      location: data.location || '',
      damageDealt: (data.damageDealt || []).join(';'), // Save all damage dealt as semicolon-separated
      damageReceived: (data.damageReceived || []).join(';'), // Save all damage received as semicolon-separated
    });
  });

  return rows;
};

/**
 * Convert ScreenData to CSV row format (single row - for backward compatibility)
 */
export const screenDataToCSVRow = (data: ScreenData): CSVRow => ({
  timestamp: data.timestamp,
  skill: data.actionText.currentActionText || '',
  skillLevel: data.actionText.skillLevel || '',
  expForNextLevel: data.actionText.expForNextLevel || '',
  gainedExp: '', // Will be calculated when saving
  drops: data.actionText.drops.join(';'),
  hp: data.actionText.inventory.hp || '',
  monster: data.monster || '',
  location: data.location || '',
  damageDealt: (data.damageDealt || []).join(';'), // Save all damage dealt as semicolon-separated
  damageReceived: (data.damageReceived || []).join(';'), // Save all damage received as semicolon-separated
});

/**
 * Convert CSV row to object
 */
export const csvRowToObject = (row: string[]): CSVRow | null => {
  // Backward compatible: handle different CSV format versions
  if (row.length < 2) return null;

  // Format versions:
  // Old (7 fields): timestamp,skill,exp,speedText,addExp,images,links
  // Medium (9 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,images,links
  // Old New (11 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,gainedExp,drops,images,links
  // New (6 fields): timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops
  // New with HP (7 fields): timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp
  // New with HP and combat (11 fields): timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived

  // Check for 11 fields first - need to distinguish between old new format and new format with combat
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

  if (isNewFormatWithCombat) {
    // New format with HP and combat: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived
    return {
      timestamp: row[0] || '',
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
    };
  } else if (isNewFormatWithHP) {
    // New format with HP: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp
    return {
      timestamp: row[0] || '',
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
    };
  } else if (isNewFormat) {
    // New format: timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops
    return {
      timestamp: row[0] || '',
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
    };
  } else if (isOldNewFormat) {
    // Old new format (11 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,gainedExp,drops,images,links
    return {
      timestamp: row[0] || '',
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
    };
  } else if (isMediumFormat) {
    // Medium format (9 fields): timestamp,skill,exp,speedText,addExp,skillLevel,expForNextLevel,images,links
    return {
      timestamp: row[0] || '',
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
    };
  } else if (isOldFormat) {
    // Old format (7 fields): timestamp,skill,exp,speedText,addExp,images,links
    return {
      timestamp: row[0] || '',
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
    };
  }

  // Unknown format, try to extract what we can
  // Always return a complete CSVRow object with all fields
  const result: CSVRow = {
    timestamp: row[0] || '',
    skill: row[1] || '',
    skillLevel: row[2] || '',
    expForNextLevel: row[3] || '',
    gainedExp: row[4] || '',
    drops: row[5] || '',
    hp: row[6] || '', // Try to get HP if available
    monster: row[7] || '', // Try to get monster if available
    location: row[8] || '', // Try to get location if available
    damageDealt: row[9] || '', // Try to get damageDealt if available
    damageReceived: row[10] || '', // Try to get damageReceived if available
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
  ].join(',');

/**
 * Get CSV header row
 */
export const getCSVHeader = (): string =>
  'timestamp,skill,skillLevel,expForNextLevel,gainedExp,drops,hp,monster,location,damageDealt,damageReceived';

/**
 * Convert ScreenData to CSV line
 */
export const screenDataToCSVLine = (data: ScreenData): string => csvRowToString(screenDataToCSVRow(data));

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
  const targetDate = new Date(refDate);
  targetDate.setHours(hour, 0, 0, 0);
  const startTime = targetDate.getTime();
  const endTime = startTime + 60 * 60 * 1000; // 1 hour later

  return rows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    return rowTime >= startTime && rowTime < endTime;
  });
};

/**
 * Get data for specific day
 */
export const filterByDay = (rows: CSVRow[], date: Date): CSVRow[] => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const startTime = startOfDay.getTime();
  const endTime = endOfDay.getTime();

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
  let totalGainedExp = 0;

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
      totalGainedExp += gainedExp;

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
