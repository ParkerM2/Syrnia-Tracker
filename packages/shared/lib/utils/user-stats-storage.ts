import type { UserStats } from './types.js';

const USER_STATS_STORAGE_KEY = 'user_stats_csv';

/**
 * Get CSV header for user stats
 */
const getUserStatsCSVHeader = (): string =>
  'timestamp,username,skill,level,totalExp,expForNextLevel,percentToNext,expLeft,gainedThisHour,gainedThisWeek,levelGainedThisWeek';

/**
 * Convert UserStats to CSV string
 */
const userStatsToCSV = (stats: UserStats): string => {
  const lines: string[] = [];
  const timestamp = stats.timestamp;
  const username = escapeCSVField(stats.username);

  Object.values(stats.skills).forEach(skillStat => {
    const line = [
      escapeCSVField(timestamp),
      escapeCSVField(username),
      escapeCSVField(skillStat.skill),
      escapeCSVField(skillStat.level),
      escapeCSVField(skillStat.totalExp),
      escapeCSVField(skillStat.expForNextLevel),
      escapeCSVField(skillStat.percentToNext.toString()),
      escapeCSVField(skillStat.expLeft),
      escapeCSVField(skillStat.gainedThisHour || ''),
      escapeCSVField(skillStat.gainedThisWeek || ''),
      escapeCSVField(skillStat.levelGainedThisWeek || ''),
    ].join(',');
    lines.push(line);
  });

  return lines.join('\n');
};

/**
 * Escape CSV field
 */
const escapeCSVField = (field: string | undefined | null): string => {
  const safeField = field || '';
  if (safeField.includes(',') || safeField.includes('"') || safeField.includes('\n')) {
    return `"${safeField.replace(/"/g, '""')}"`;
  }
  return safeField;
};

/**
 * Parse CSV content to UserStats
 */
const parseUserStatsCSV = (csvContent: string): UserStats | null => {
  const lines = csvContent.trim().split('\n');

  if (lines.length === 0) {
    return null;
  }

  // Check if first line is header
  const header = getUserStatsCSVHeader();
  if (lines[0] === header && lines.length === 1) {
    return null;
  }

  // Skip header row
  const dataLines = lines.slice(1);

  if (dataLines.length === 0) {
    return null;
  }

  // Parse CSV rows
  const rows: Array<{
    timestamp: string;
    username: string;
    skill: string;
    level: string;
    totalExp: string;
    expForNextLevel: string;
    percentToNext: string;
    expLeft: string;
    gainedThisHour: string;
    gainedThisWeek: string;
    levelGainedThisWeek: string;
  }> = [];

  dataLines.forEach(line => {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
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
    row.push(current);

    if (row.length >= 11) {
      rows.push({
        timestamp: row[0] || '',
        username: row[1] || '',
        skill: row[2] || '',
        level: row[3] || '',
        totalExp: row[4] || '',
        expForNextLevel: row[5] || '',
        percentToNext: row[6] || '0',
        expLeft: row[7] || '',
        gainedThisHour: row[8] || '',
        gainedThisWeek: row[9] || '',
        levelGainedThisWeek: row[10] || '',
      });
    }
  });

  if (rows.length === 0) {
    return null;
  }

  // Get the most recent entry (first row should be the latest)
  const latestRow = rows[0];
  const username = latestRow.username;
  const timestamp = latestRow.timestamp;

  // Group by skill and get the latest entry for each skill
  const skills: Record<
    string,
    {
      skill: string;
      level: string;
      totalExp: string;
      expForNextLevel: string;
      percentToNext: number;
      expLeft: string;
      gainedThisHour?: string;
      gainedThisWeek?: string;
      levelGainedThisWeek?: string;
    }
  > = {};
  const seenSkills = new Set<string>();

  rows.forEach(row => {
    if (!seenSkills.has(row.skill) && row.skill) {
      seenSkills.add(row.skill);
      skills[row.skill] = {
        skill: row.skill,
        level: row.level,
        totalExp: row.totalExp,
        expForNextLevel: row.expForNextLevel,
        percentToNext: parseFloat(row.percentToNext) || 0,
        expLeft: row.expLeft,
        gainedThisHour: row.gainedThisHour || undefined,
        gainedThisWeek: row.gainedThisWeek || undefined,
        levelGainedThisWeek: row.levelGainedThisWeek || undefined,
      };
    }
  });

  if (!username || Object.keys(skills).length === 0) {
    return null;
  }

  return {
    username,
    timestamp,
    skills,
  };
};

/**
 * Get user stats CSV from storage
 */
const getUserStatsCSVFromStorage = async (): Promise<string> => {
  try {
    const result = await chrome.storage.local.get(USER_STATS_STORAGE_KEY);
    return result[USER_STATS_STORAGE_KEY] || getUserStatsCSVHeader();
  } catch {
    return getUserStatsCSVHeader();
  }
};

/**
 * Save UserStats to CSV in storage
 * Replaces existing data (only keep latest stats)
 */
const saveUserStatsToCSV = async (stats: UserStats): Promise<void> => {
  try {
    const csvContent = `${getUserStatsCSVHeader()}\n${userStatsToCSV(stats)}`;
    await chrome.storage.local.set({ [USER_STATS_STORAGE_KEY]: csvContent });
  } catch {
    // Silently handle errors
  }
};

/**
 * Get UserStats from storage
 */
const getUserStatsFromStorage = async (): Promise<UserStats | null> => {
  try {
    const csvContent = await getUserStatsCSVFromStorage();
    return parseUserStatsCSV(csvContent);
  } catch {
    return null;
  }
};

export { getUserStatsCSVHeader, getUserStatsCSVFromStorage, saveUserStatsToCSV, getUserStatsFromStorage };
