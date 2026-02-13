/**
 * Unified Storage Service
 *
 * This service provides a centralized interface for all data storage operations.
 * It follows the Single Responsibility Principle and provides clear separation of concerns.
 *
 * Key principles:
 * - Stats page data is the source of truth for current/hourly/weekly exp
 * - Tracked data (CSV) is supplementary and used for historical analysis
 * - All storage operations go through this service
 * - CSV export is unified and consistent
 */

import { escapeCSVField, parseCSVLine } from "./csv-helpers";
import { parseCSV, csvRowToString, getCSVHeader } from "./csv-tracker";
import { getWeeklyStatsHeader, weeklyStatsRowToString, parseWeeklyStatsRow } from "./weekly-stats-storage";
import type { CSVRow } from "./csv-tracker";
import type { WeeklyStatsRow } from "./weekly-stats-storage";
import type { SessionBaseline, UntrackedExpRecord, UserStats } from "@app/types";

/**
 * Get CSV header for user stats
 */
const getUserStatsCSVHeader = (): string =>
  "timestamp,username,skill,level,totalExp,expForNextLevel,percentToNext,expLeft,gainedThisHour,gainedThisWeek,levelGainedThisWeek";

// Storage keys
const STORAGE_KEYS = {
  TRACKED_DATA: "tracked_data_csv",
  USER_STATS: "user_stats_csv",
  WEEKLY_STATS: "weekly_stats_csv",
  LAST_EXP_BY_SKILL: "last_exp_by_skill",
  ITEM_VALUES: "drop_gp_values",
  SESSION_BASELINE: "session_baseline",
  UNTRACKED_EXP: "untracked_exp_records",
} as const;

/**
 * Get data from chrome.storage.local
 */
const getFromStorage = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Set data in chrome.storage.local
 */
const setInStorage = async (key: string, value: unknown): Promise<void> => {
  await chrome.storage.local.set({ [key]: value });
};

// ============================================================================
// Tracked Data (CSV) Operations
// ============================================================================

/**
 * Get all tracked CSV rows
 */
const getTrackedData = async (): Promise<CSVRow[]> => {
  const csvContent = await getFromStorage(STORAGE_KEYS.TRACKED_DATA, getCSVHeader());
  return parseCSV(csvContent);
};

/**
 * Append tracked data rows
 */
const appendTrackedData = async (rows: CSVRow[]): Promise<void> => {
  const existingCSV = await getFromStorage(STORAGE_KEYS.TRACKED_DATA, getCSVHeader());

  const newLines = rows.map(row => csvRowToString(row));

  const updatedCSV =
    existingCSV === getCSVHeader()
      ? `${existingCSV}\n${newLines.join("\n")}`
      : `${existingCSV}\n${newLines.join("\n")}`;

  await setInStorage(STORAGE_KEYS.TRACKED_DATA, updatedCSV);
};

/**
 * Clear all tracked data
 */
const clearTrackedData = async (): Promise<void> => {
  await setInStorage(STORAGE_KEYS.TRACKED_DATA, getCSVHeader());
};

/**
 * Clear tracked data for a specific hour
 */
const clearTrackedDataByHour = async (hour: number, date?: Date): Promise<void> => {
  const allRows = await getTrackedData();

  const refDate = date || new Date();
  const targetDate = new Date(refDate);
  targetDate.setHours(hour, 0, 0, 0);
  const startTime = targetDate.getTime();
  const endTime = startTime + 60 * 60 * 1000;

  const filteredRows = allRows.filter(row => {
    const rowTime = new Date(row.timestamp).getTime();
    return !(rowTime >= startTime && rowTime < endTime);
  });

  if (filteredRows.length === 0) {
    await clearTrackedData();
  } else {
    const header = getCSVHeader();
    const lines = filteredRows.map(row => csvRowToString(row));
    const updatedCSV = `${header}\n${lines.join("\n")}`;
    await setInStorage(STORAGE_KEYS.TRACKED_DATA, updatedCSV);
  }
};

/**
 * Get tracked data as CSV string
 */
const getTrackedDataCSV = async (): Promise<string> => await getFromStorage(STORAGE_KEYS.TRACKED_DATA, getCSVHeader());

// ============================================================================
// User Stats Operations
// ============================================================================

/**
 * Get user stats from storage
 */
const getUserStats = async (): Promise<UserStats | null> => {
  const csvContent = await getFromStorage(STORAGE_KEYS.USER_STATS, getUserStatsCSVHeader());

  // Parse CSV content
  const lines = csvContent.trim().split("\n");
  if (lines.length <= 1) return null;

  const header = getUserStatsCSVHeader();
  if (lines[0] === header && lines.length === 1) return null;

  const dataLines = lines.slice(1);
  if (dataLines.length === 0) return null;

  // Parse rows
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
    const row = parseCSVLine(line);

    if (row.length >= 11) {
      rows.push({
        timestamp: row[0] || "",
        username: row[1] || "",
        skill: row[2] || "",
        level: row[3] || "",
        totalExp: row[4] || "",
        expForNextLevel: row[5] || "",
        percentToNext: row[6] || "0",
        expLeft: row[7] || "",
        gainedThisHour: row[8] || "",
        gainedThisWeek: row[9] || "",
        levelGainedThisWeek: row[10] || "",
      });
    }
  });

  if (rows.length === 0) return null;

  const latestRow = rows[0];
  const username = latestRow.username;
  const timestamp = latestRow.timestamp;

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

  if (!username || Object.keys(skills).length === 0) return null;

  return { username, timestamp, skills };
};

/**
 * Save user stats to storage
 */
const saveUserStats = async (stats: UserStats): Promise<void> => {
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
      escapeCSVField(skillStat.gainedThisHour || ""),
      escapeCSVField(skillStat.gainedThisWeek || ""),
      escapeCSVField(skillStat.levelGainedThisWeek || ""),
    ].join(",");
    lines.push(line);
  });

  const csvContent = `${getUserStatsCSVHeader()}\n${lines.join("\n")}`;
  await setInStorage(STORAGE_KEYS.USER_STATS, csvContent);
};

/**
 * Get user stats as CSV string
 */
const getUserStatsCSV = async (): Promise<string> =>
  await getFromStorage(STORAGE_KEYS.USER_STATS, getUserStatsCSVHeader());

// ============================================================================
// Weekly Stats Operations
// ============================================================================

/**
 * Get all weekly stats
 */
const getWeeklyStats = async (): Promise<WeeklyStatsRow[]> => {
  const csvContent = await getFromStorage(STORAGE_KEYS.WEEKLY_STATS, getWeeklyStatsHeader());

  const lines = csvContent.split("\n").filter((line: string) => line.trim());
  if (lines.length <= 1) return [];

  return lines
    .slice(1)
    .map((line: string) => {
      const row = line.split(",");
      return parseWeeklyStatsRow(row);
    })
    .filter((row: WeeklyStatsRow | null): row is WeeklyStatsRow => row !== null);
};

/**
 * Save weekly stats
 */
const saveWeeklyStats = async (stats: WeeklyStatsRow[]): Promise<void> => {
  const header = getWeeklyStatsHeader();
  const lines = stats.map(weeklyStatsRowToString);
  const csvContent = `${header}\n${lines.join("\n")}`;
  await setInStorage(STORAGE_KEYS.WEEKLY_STATS, csvContent);
};

/**
 * Get weekly stats as CSV string
 */
const getWeeklyStatsCSV = async (): Promise<string> =>
  await getFromStorage(STORAGE_KEYS.WEEKLY_STATS, getWeeklyStatsHeader());

// ============================================================================
// Last Exp Tracking (for calculating deltas)
// ============================================================================

/**
 * Get last exp by skill
 * Handles backwards compatibility: old format stored plain numbers, new format stores { exp, ts }.
 */
const getLastExpBySkill = async (): Promise<Record<string, { exp: number; ts: number }>> => {
  const raw: Record<string, number | { exp: number; ts: number }> = await getFromStorage(
    STORAGE_KEYS.LAST_EXP_BY_SKILL,
    {},
  );
  const result: Record<string, { exp: number; ts: number }> = {};
  for (const [skill, value] of Object.entries(raw)) {
    if (typeof value === "number") {
      // Old format — migrate with ts: 0 so it's treated as stale on first use
      result[skill] = { exp: value, ts: 0 };
    } else {
      result[skill] = value;
    }
  }
  return result;
};

/**
 * Save last exp by skill
 */
const saveLastExpBySkill = async (lastExp: Record<string, { exp: number; ts: number }>): Promise<void> => {
  await setInStorage(STORAGE_KEYS.LAST_EXP_BY_SKILL, lastExp);
};

// ============================================================================
// Item Values Operations
// ============================================================================

/**
 * Get item values (GP values for tracked items)
 */
const getItemValues = async (): Promise<Record<string, string>> => await getFromStorage(STORAGE_KEYS.ITEM_VALUES, {});

/**
 * Save item values (GP values for tracked items)
 */
const saveItemValues = async (values: Record<string, string>): Promise<void> => {
  await setInStorage(STORAGE_KEYS.ITEM_VALUES, values);
};

// ============================================================================
// Session Baseline Operations
// ============================================================================

/**
 * Get the session baseline (snapshot of all skills at session start)
 */
const getSessionBaseline = async (): Promise<SessionBaseline | null> =>
  await getFromStorage<SessionBaseline | null>(STORAGE_KEYS.SESSION_BASELINE, null);

/**
 * Save session baseline
 */
const saveSessionBaseline = async (baseline: SessionBaseline): Promise<void> => {
  await setInStorage(STORAGE_KEYS.SESSION_BASELINE, baseline);
};

// ============================================================================
// Untracked Exp Operations
// ============================================================================

/**
 * Get all untracked exp records
 */
const getUntrackedExpRecords = async (): Promise<UntrackedExpRecord[]> =>
  await getFromStorage<UntrackedExpRecord[]>(STORAGE_KEYS.UNTRACKED_EXP, []);

/**
 * Save a single untracked exp record (appends to existing)
 */
const saveUntrackedExpRecord = async (record: UntrackedExpRecord): Promise<void> => {
  const existing = await getUntrackedExpRecords();

  // Deduplicate: skip if same skill + overlapping time range exists
  const isDuplicate = existing.some(
    r =>
      r.skill === record.skill &&
      new Date(r.startUTC).getTime() < new Date(record.endUTC).getTime() &&
      new Date(r.endUTC).getTime() > new Date(record.startUTC).getTime(),
  );
  if (isDuplicate) return;

  // Prune old records (90 days retention)
  const MAX_RECORD_AGE_MS = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const pruned = existing.filter(r => now - new Date(r.detectedAt).getTime() < MAX_RECORD_AGE_MS);
  pruned.push(record);
  await setInStorage(STORAGE_KEYS.UNTRACKED_EXP, pruned);
};

// ============================================================================
// CSV Export Operations
// ============================================================================

/**
 * Generic CSV download helper
 */
const downloadCSV = async (csvContent: string, filename: string, saveAs: boolean): Promise<void> => {
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: saveAs,
  });

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Download tracked data as CSV
 */
const downloadTrackedDataCSV = async (saveAs: boolean = true): Promise<void> => {
  const csvContent = await getTrackedDataCSV();
  const date = new Date().toISOString().split("T")[0];
  await downloadCSV(csvContent, `tracked_data_${date}.csv`, saveAs);
};

/**
 * Download user stats as CSV
 */
const downloadUserStatsCSV = async (saveAs: boolean = true): Promise<void> => {
  const csvContent = await getUserStatsCSV();
  const date = new Date().toISOString().split("T")[0];
  await downloadCSV(csvContent, `user_stats_${date}.csv`, saveAs);
};

/**
 * Download weekly stats as CSV
 */
const downloadWeeklyStatsCSV = async (saveAs: boolean = true): Promise<void> => {
  const csvContent = await getWeeklyStatsCSV();
  const date = new Date().toISOString().split("T")[0];
  await downloadCSV(csvContent, `weekly_stats_${date}.csv`, saveAs);
};

/**
 * Download all data as separate CSV files
 */
const downloadAllDataCSV = async (saveAs: boolean = true): Promise<void> => {
  await Promise.all([downloadTrackedDataCSV(saveAs), downloadUserStatsCSV(saveAs), downloadWeeklyStatsCSV(saveAs)]);
};

// ============================================================================
// Exports
// ============================================================================

export {
  getTrackedData,
  appendTrackedData,
  clearTrackedData,
  clearTrackedDataByHour,
  getTrackedDataCSV,
  getUserStats,
  saveUserStats,
  getUserStatsCSV,
  getWeeklyStats,
  saveWeeklyStats,
  getWeeklyStatsCSV,
  getLastExpBySkill,
  saveLastExpBySkill,
  getItemValues,
  saveItemValues,
  getSessionBaseline,
  saveSessionBaseline,
  getUntrackedExpRecords,
  saveUntrackedExpRecord,
  downloadTrackedDataCSV,
  downloadUserStatsCSV,
  downloadWeeklyStatsCSV,
  downloadAllDataCSV,
  getUserStatsCSVHeader,
};
