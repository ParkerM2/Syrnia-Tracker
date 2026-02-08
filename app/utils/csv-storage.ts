import { screenDataToCSVRows, csvRowToString, getCSVHeader, parseCSV } from './csv-tracker';
import { updateWeeklyStats } from './weekly-stats-storage';
import type { CSVRow } from './csv-tracker';
import type { ScreenData } from '@app/types';

const CSV_STORAGE_KEY = 'tracked_data_csv';
const CSV_FILENAME = 'tracked_data.csv';
const LAST_EXP_BY_SKILL_KEY = 'last_exp_by_skill'; // Store last exp per skill for calculating gainedExp

/**
 * Get CSV content from storage
 */
export const getCSVFromStorage = async (): Promise<string> => {
  try {
    const result = await chrome.storage.local.get(CSV_STORAGE_KEY);
    const csvContent = result[CSV_STORAGE_KEY] || getCSVHeader();

    // Ensure CSV header includes equipment and combatExp columns (migrate old CSV files)
    const lines = csvContent.trim().split('\n');
    if (lines.length > 0) {
      const currentHeader = lines[0];
      const expectedHeader = getCSVHeader();

      // If header doesn't match, update it (migration for old CSV files)
      if (currentHeader !== expectedHeader) {
        const dataLines = lines.slice(1);
        const currentFieldCount = currentHeader.split(',').length;
        const expectedFieldCount = expectedHeader.split(',').length;

        if (currentFieldCount < expectedFieldCount) {
          // Old format detected - update header and add missing columns to existing rows
          const updatedLines = [
            expectedHeader,
            ...dataLines.map((line: string) => {
              const trimmedLine = line.trim();
              // Add missing fields (equipment and/or combatExp) as empty strings
              const missingFields = expectedFieldCount - currentFieldCount;
              return `${trimmedLine}${','.repeat(missingFields)}`;
            }),
          ];
          const updatedCSV = updatedLines.join('\n');
          // Save updated CSV back to storage
          await chrome.storage.local.set({ [CSV_STORAGE_KEY]: updatedCSV });
          return updatedCSV;
        }
      }
    }

    return csvContent;
  } catch {
    return getCSVHeader();
  }
};

/**
 * Append ScreenData to CSV in storage
 * Saves main skill row plus each combatExp gain as separate rows
 * Calculates and saves gainedExp for each entry
 */
export const appendToCSV = async (data: ScreenData): Promise<void> => {
  try {
    const existingCSV = await getCSVFromStorage();

    // Get last exp per skill from storage (for calculating gainedExp deltas)
    const lastExpResult = await chrome.storage.local.get(LAST_EXP_BY_SKILL_KEY);
    const lastExpBySkill: Record<string, number> = lastExpResult[LAST_EXP_BY_SKILL_KEY] || {};

    // Get all rows (main + combat exp gains)
    const rows = screenDataToCSVRows(data);

    // Get the main skill's exp from screen data to calculate gainedExp
    const mainSkillExp = parseInt(data.actionText.exp || '0', 10) || 0;
    const mainSkill = data.actionText.currentActionText || '';

    // Calculate gainedExp for each row
    const rowsWithGainedExp = rows.map(row => {
      // If gainedExp is already set, use it
      if (row.gainedExp) {
        return row;
      }

      // For main skill entries, calculate gainedExp from exp delta
      if (row.skill === mainSkill && mainSkillExp > 0) {
        const lastExp = lastExpBySkill[mainSkill] || 0;
        const delta = mainSkillExp - lastExp;
        const gainedExp = delta > 0 ? delta.toString() : '0';

        // Update last exp for this skill
        lastExpBySkill[mainSkill] = mainSkillExp;

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

    // Save updated last exp per skill
    await chrome.storage.local.set({ [LAST_EXP_BY_SKILL_KEY]: lastExpBySkill });

    // Convert rows to CSV lines
    const newLines = rowsWithGainedExp.map(row => csvRowToString(row));

    // Append all new lines
    const updatedCSV =
      existingCSV === getCSVHeader()
        ? `${existingCSV}\n${newLines.join('\n')}`
        : `${existingCSV}\n${newLines.join('\n')}`;

    await chrome.storage.local.set({ [CSV_STORAGE_KEY]: updatedCSV });

    // Update weekly stats after saving to CSV
    // Get all rows to calculate weekly stats
    const allRows = await getCSVRows();
    await updateWeeklyStats(allRows);
  } catch {
    // Silently handle errors
  }
};

/**
 * Get all CSV rows from storage
 */
export const getCSVRows = async (): Promise<CSVRow[]> => {
  try {
    const csvContent = await getCSVFromStorage();
    return parseCSV(csvContent);
  } catch {
    return [];
  }
};

/**
 * Download CSV file using Chrome Downloads API
 * @param saveAs - If true, shows file picker dialog to let user choose
 * save location. If false, saves to default Downloads folder.
 */
export const downloadCSV = async (saveAs: boolean = true): Promise<void> => {
  const csvContent = await getCSVFromStorage();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  // Get current date for filename
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `tracked_data_${dateStr}.csv`;

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: saveAs, // If true, shows file picker; if false, saves to default Downloads folder
  });

  // Clean up the object URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Clear all CSV data from storage
 */
export const clearCSVData = async (): Promise<void> => {
  await chrome.storage.local.set({ [CSV_STORAGE_KEY]: getCSVHeader() });
};

/**
 * Clear CSV data for a specific hour
 */
export const clearCSVDataByHour = async (hour: number, date?: Date): Promise<void> => {
  const csvContent = await getCSVFromStorage();
  const allRows = parseCSV(csvContent);

  // Filter out rows for the specified hour
  const refDate = date || new Date();
  const targetDate = new Date(refDate);
  targetDate.setHours(hour, 0, 0, 0);
  const startTime = targetDate.getTime();
  const endTime = startTime + 60 * 60 * 1000; // 1 hour later

  const filteredRows = allRows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    // Keep rows that are NOT in the specified hour
    return !(rowTime >= startTime && rowTime < endTime);
  });

  // Rebuild CSV with filtered rows
  if (filteredRows.length === 0) {
    await chrome.storage.local.set({ [CSV_STORAGE_KEY]: getCSVHeader() });
  } else {
    const header = getCSVHeader();
    const lines = filteredRows.map(row => csvRowToString(row));
    const updatedCSV = `${header}\n${lines.join('\n')}`;
    await chrome.storage.local.set({ [CSV_STORAGE_KEY]: updatedCSV });
  }
};

/**
 * Get CSV filename constant
 */
export const getCSVFilename = (): string => CSV_FILENAME;
