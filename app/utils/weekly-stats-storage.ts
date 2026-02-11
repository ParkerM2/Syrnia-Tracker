import { parseDrops, parseDropAmount } from "./formatting";
import type { CSVRow } from "./csv-tracker";
import type { UserStats } from "@app/types";

const WEEKLY_STATS_STORAGE_KEY = "weekly_stats_csv";

interface WeeklyStatsRow {
  weekKey: string; // Format: YYYY-WW (year-week number)
  weekStart: string; // ISO timestamp of week start (Sunday 6pm EST)
  weekEnd: string; // ISO timestamp of week end
  totalExp: string;
  expBySkill: string; // JSON string of Record<string, number>
  totalDrops: string;
  dropsByItem: string; // JSON string of Record<string, { count: number; totalAmount: number }>
  hpUsed: string; // Total HP used this week
  totalEntries: string;
  lastUpdated: string; // ISO timestamp of last update
}

/**
 * Get the date/time components in EST/EDT timezone
 */
const getESTComponents = (
  date: Date,
): { year: number; month: number; day: number; hour: number; minute: number; second: number; dayOfWeek: number } => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: parseInt(parts.find(p => p.type === "year")!.value),
    month: parseInt(parts.find(p => p.type === "month")!.value) - 1,
    day: parseInt(parts.find(p => p.type === "day")!.value),
    hour: parseInt(parts.find(p => p.type === "hour")!.value),
    minute: parseInt(parts.find(p => p.type === "minute")!.value),
    second: parseInt(parts.find(p => p.type === "second")!.value),
    dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find(p => p.type === "weekday")!.value),
  };
};

/**
 * Create a UTC Date object that represents a specific time in EST/EDT
 * @param year Year in EST
 * @param month Month in EST (0-11)
 * @param day Day in EST
 * @param hour Hour in EST (0-23)
 * @param minute Minute in EST (0-59)
 * @param second Second in EST (0-59)
 */
const createESTDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  second: number = 0,
): Date => {
  // Create a temporary date to check DST for Eastern timezone
  // We use local timezone for the calendar date check, which is fine for determining DST period
  const tempDate = new Date(year, month, day);

  // Check if we're in DST for Eastern timezone
  // DST: 2nd Sunday of March to 1st Sunday of November
  const getDSTStart = (y: number) => {
    const march1 = new Date(y, 2, 1);
    const firstSunday = (7 - march1.getDay()) % 7;
    return new Date(y, 2, 1 + firstSunday + 7);
  };

  const getDSTEnd = (y: number) => {
    const nov1 = new Date(y, 10, 1);
    const firstSunday = (7 - nov1.getDay()) % 7;
    return new Date(y, 10, 1 + firstSunday);
  };

  const dstStart = getDSTStart(year);
  const dstEnd = getDSTEnd(year);
  const isInDST = tempDate >= dstStart && tempDate < dstEnd;

  // EST is UTC-5 (300 minutes), EDT is UTC-4 (240 minutes)
  // To convert EST/EDT time to UTC, we add the offset
  const estOffsetMinutes = isInDST ? 240 : 300;

  // Create UTC date: EST time + offset = UTC time
  // If it's 6pm EST (18:00), that's 18:00 + 5 hours = 23:00 UTC (or 22:00 UTC in EDT)
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));

  // Adjust for EST/EDT offset (add offset to convert EST to UTC)
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() + estOffsetMinutes);

  return utcDate;
};

/**
 * Get week key for a given date (week starts Sunday 6pm EST)
 * Returns format: YYYY-MM-DD (date of Sunday 6pm EST that starts the week)
 */
const getWeekKey = (date: Date = new Date()): string => {
  // Get date components in EST/EDT
  const est = getESTComponents(date);

  // Calculate days to subtract to get to Sunday
  let daysToSubtract = est.dayOfWeek;

  // If it's Sunday and before 6pm (18:00) EST, this week started last Sunday
  // If it's Sunday and after 6pm EST, this is the start of the current week
  if (est.dayOfWeek === 0) {
    if (est.hour < 18) {
      daysToSubtract = 7; // Go back to previous Sunday
    } else {
      daysToSubtract = 0; // This is the start
    }
  }

  // Calculate week start date in EST
  const weekStartDate = new Date(est.year, est.month, est.day);
  weekStartDate.setDate(weekStartDate.getDate() - daysToSubtract);

  // Return as YYYY-MM-DD format
  const year = weekStartDate.getFullYear();
  const month = String(weekStartDate.getMonth() + 1).padStart(2, "0");
  const day = String(weekStartDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Get week start and end dates for a week key
 * Returns dates in UTC that represent Sunday 6pm EST and the following Sunday 6pm EST
 */
const getWeekDates = (weekKey: string): { weekStart: Date; weekEnd: Date } => {
  // Parse YYYY-MM-DD format
  const [year, month, day] = weekKey.split("-").map(Number);

  // Calculate week start (Sunday 6pm EST/EDT converted to UTC)
  const weekStart = createESTDate(year, month - 1, day, 18, 0, 0);

  // Week ends next Sunday at 6pm EST (7 days later)
  const nextSunday = new Date(year, month - 1, day);
  nextSunday.setDate(nextSunday.getDate() + 7);
  const weekEnd = createESTDate(nextSunday.getFullYear(), nextSunday.getMonth(), nextSunday.getDate(), 18, 0, 0);

  return { weekStart, weekEnd };
};

/**
 * Get CSV header for weekly stats
 */
const getWeeklyStatsHeader = (): string =>
  "weekKey,weekStart,weekEnd,totalExp,expBySkill,totalDrops,dropsByItem,hpUsed,totalEntries,lastUpdated";

/**
 * Convert weekly stats row to CSV string
 */
const weeklyStatsRowToString = (row: WeeklyStatsRow): string =>
  [
    row.weekKey,
    row.weekStart,
    row.weekEnd,
    row.totalExp,
    row.expBySkill,
    row.totalDrops,
    row.dropsByItem,
    row.hpUsed,
    row.totalEntries,
    row.lastUpdated,
  ].join(",");

/**
 * Parse CSV row to weekly stats row
 */
const parseWeeklyStatsRow = (row: string[]): WeeklyStatsRow | null => {
  if (row.length < 10) return null;

  return {
    weekKey: row[0] || "",
    weekStart: row[1] || "",
    weekEnd: row[2] || "",
    totalExp: row[3] || "0",
    expBySkill: row[4] || "{}",
    totalDrops: row[5] || "0",
    dropsByItem: row[6] || "{}",
    hpUsed: row[7] || "0",
    totalEntries: row[8] || "0",
    lastUpdated: row[9] || "",
  };
};

/**
 * Get all weekly stats from storage
 */
const getWeeklyStatsFromStorage = async (): Promise<WeeklyStatsRow[]> => {
  try {
    const result = await chrome.storage.local.get(WEEKLY_STATS_STORAGE_KEY);
    const csvContent = result[WEEKLY_STATS_STORAGE_KEY] || getWeeklyStatsHeader();

    const lines = csvContent.split("\n").filter((line: string) => line.trim());
    if (lines.length <= 1) return []; // Only header or empty

    return lines
      .slice(1)
      .map((line: string) => {
        const row = line.split(",");
        return parseWeeklyStatsRow(row);
      })
      .filter((row: WeeklyStatsRow | null): row is WeeklyStatsRow => row !== null);
  } catch {
    return [];
  }
};

/**
 * Get weekly stats for current week
 */
const getCurrentWeekStats = async (): Promise<WeeklyStatsRow | null> => {
  const weekKey = getWeekKey();
  const allStats = await getWeeklyStatsFromStorage();
  return allStats.find(stat => stat.weekKey === weekKey) || null;
};

/**
 * Update or create weekly stats row
 * This should be called whenever tracked data is updated
 */
const updateWeeklyStats = async (allRows: CSVRow[]): Promise<void> => {
  try {
    const weekKey = getWeekKey();
    const { weekStart, weekEnd } = getWeekDates(weekKey);

    // Get existing weekly stats
    const allStats = await getWeeklyStatsFromStorage();

    // Filter rows for current week
    const weekStartTime = weekStart.getTime();
    const weekEndTime = weekEnd.getTime();
    const weekRows = allRows.filter(row => {
      const rowTime = new Date(row.timestamp).getTime();
      return rowTime >= weekStartTime && rowTime < weekEndTime;
    });

    // Calculate stats for the week
    let totalExp = 0;
    const expBySkill: Record<string, number> = {};
    const dropsByItem: Record<string, { count: number; totalAmount: number }> = {};
    let totalDrops = 0;
    let hpUsed = 0;

    // Deduplicate entries and merge drops
    const uniqueEntriesMap = new Map<string, CSVRow>();
    weekRows.forEach(row => {
      const key = `${row.timestamp}-${row.skill}`;
      const existing = uniqueEntriesMap.get(key);

      if (!existing) {
        uniqueEntriesMap.set(key, { ...row });
      } else {
        // Merge drops from both rows
        const existingDrops = existing.drops || "";
        const currentDrops = row.drops || "";
        const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== "").join(";");

        // Keep the one with higher gainedExp or more complete data, but preserve merged drops
        const existingGainedExp = parseInt(existing.gainedExp || "0", 10) || 0;
        const currentGainedExp = parseInt(row.gainedExp || "0", 10) || 0;

        if (currentGainedExp > existingGainedExp || (currentGainedExp === existingGainedExp && row.skillLevel)) {
          uniqueEntriesMap.set(key, { ...row, drops: mergedDrops });
        } else {
          uniqueEntriesMap.set(key, { ...existing, drops: mergedDrops });
        }
      }
    });

    const uniqueEntries = Array.from(uniqueEntriesMap.values());

    // Calculate exp
    uniqueEntries.forEach(row => {
      const gainedExp = parseInt(row.gainedExp || "0", 10) || 0;
      if (gainedExp > 0) {
        totalExp += gainedExp;
        const skill = row.skill || "";
        if (skill) {
          expBySkill[skill] = (expBySkill[skill] || 0) + gainedExp;
        }
      }

      // Calculate drops
      const drops = parseDrops(row.drops || "");
      drops.forEach(drop => {
        const { amount, name } = parseDropAmount(drop);
        if (!dropsByItem[name]) {
          dropsByItem[name] = { count: 0, totalAmount: 0 };
        }
        dropsByItem[name].count += 1;
        dropsByItem[name].totalAmount += amount;
        totalDrops += 1;
      });
    });

    // Calculate HP used
    const hpEntries = uniqueEntries
      .filter(row => row.hp && row.hp.trim() !== "")
      .map(row => {
        const hpValue = parseInt(row.hp.replace(/,/g, ""), 10);
        return {
          timestamp: row.timestamp,
          hp: isNaN(hpValue) ? null : hpValue,
        };
      })
      .filter(entry => entry.hp !== null)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (hpEntries.length >= 2) {
      const firstHP = hpEntries[0].hp!;
      const lastHP = hpEntries[hpEntries.length - 1].hp!;
      hpUsed = firstHP - lastHP;
    }

    // Create or update weekly stats row
    const weeklyStatsRow: WeeklyStatsRow = {
      weekKey,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalExp: totalExp.toString(),
      expBySkill: JSON.stringify(expBySkill),
      totalDrops: totalDrops.toString(),
      dropsByItem: JSON.stringify(dropsByItem),
      hpUsed: hpUsed.toString(),
      totalEntries: uniqueEntries.length.toString(),
      lastUpdated: new Date().toISOString(),
    };

    // Update or add the row
    const otherStats = allStats.filter(stat => stat.weekKey !== weekKey);
    const updatedStats = [...otherStats, weeklyStatsRow].sort((a, b) => b.weekKey.localeCompare(a.weekKey));

    // Save to storage
    const header = getWeeklyStatsHeader();
    const lines = updatedStats.map(weeklyStatsRowToString);
    const csvContent = `${header}\n${lines.join("\n")}`;

    await chrome.storage.local.set({ [WEEKLY_STATS_STORAGE_KEY]: csvContent });
  } catch {
    // Silently handle errors
  }
};

/**
 * Update weekly stats from stats URL data (source of truth)
 * This function uses the gainedThisWeek values from the stats page as the authoritative source.
 * The weekKey/weekStart/weekEnd are preserved (not recalculated), only lastUpdated is updated.
 * Falls back to tracked data if gainedThisWeek is not available.
 */
const updateWeeklyStatsFromStatsURL = async (userStats: UserStats, allRows: CSVRow[]): Promise<void> => {
  try {
    const weekKey = getWeekKey();
    const { weekStart, weekEnd } = getWeekDates(weekKey);

    // Get existing weekly stats
    const allStats = await getWeeklyStatsFromStorage();
    const existingWeekStats = allStats.find(stat => stat.weekKey === weekKey);

    // Preserve existing weekKey/weekStart/weekEnd, or use new ones if doesn't exist
    const preservedWeekKey = existingWeekStats?.weekKey || weekKey;
    const preservedWeekStart = existingWeekStats?.weekStart || weekStart.toISOString();
    const preservedWeekEnd = existingWeekStats?.weekEnd || weekEnd.toISOString();

    // Calculate exp from stats URL (source of truth)
    let totalExp = 0;
    const expBySkill: Record<string, number> = {};

    // Use gainedThisWeek from stats URL as primary source
    Object.values(userStats.skills).forEach(skillStat => {
      const skillName = skillStat.skill;
      let gainedExp = 0;

      // Primary: Use gainedThisWeek from stats URL
      if (skillStat.gainedThisWeek) {
        gainedExp = parseInt(skillStat.gainedThisWeek.replace(/,/g, ""), 10) || 0;
      }

      // Fallback: Calculate from tracked data if gainedThisWeek is not available
      if (gainedExp === 0 && allRows.length > 0) {
        const weekStartTime = new Date(preservedWeekStart).getTime();
        const weekEndTime = new Date(preservedWeekEnd).getTime();
        const weekRows = allRows.filter(row => {
          const rowTime = new Date(row.timestamp).getTime();
          return rowTime >= weekStartTime && rowTime < weekEndTime && row.skill === skillName;
        });

        // Sum up exp from tracked data for this skill
        weekRows.forEach(row => {
          const rowExp = parseInt(row.gainedExp || "0", 10) || 0;
          gainedExp += rowExp;
        });
      }

      if (gainedExp > 0) {
        totalExp += gainedExp;
        expBySkill[skillName] = gainedExp;
      }
    });

    // Preserve drops and HP from existing stats or calculate from tracked data
    let totalDrops = 0;
    const dropsByItem: Record<string, { count: number; totalAmount: number }> = {};
    let hpUsed = 0;
    let totalEntries = 0;

    if (existingWeekStats) {
      // Preserve drops and HP from existing stats
      try {
        const existingDrops = JSON.parse(existingWeekStats.dropsByItem || "{}");
        Object.assign(dropsByItem, existingDrops);
        totalDrops = parseInt(existingWeekStats.totalDrops || "0", 10) || 0;
        hpUsed = parseInt(existingWeekStats.hpUsed || "0", 10) || 0;
        totalEntries = parseInt(existingWeekStats.totalEntries || "0", 10) || 0;
      } catch {
        // If parsing fails, calculate from tracked data
      }
    }

    // If we don't have existing stats, calculate drops and HP from tracked data
    if (totalDrops === 0 && hpUsed === 0 && allRows.length > 0) {
      const weekStartTime = new Date(preservedWeekStart).getTime();
      const weekEndTime = new Date(preservedWeekEnd).getTime();
      const weekRows = allRows.filter(row => {
        const rowTime = new Date(row.timestamp).getTime();
        return rowTime >= weekStartTime && rowTime < weekEndTime;
      });

      // Deduplicate entries
      const uniqueEntriesMap = new Map<string, CSVRow>();
      weekRows.forEach(row => {
        const key = `${row.timestamp}-${row.skill}`;
        const existing = uniqueEntriesMap.get(key);

        if (!existing) {
          uniqueEntriesMap.set(key, { ...row });
        } else {
          const existingDrops = existing.drops || "";
          const currentDrops = row.drops || "";
          const mergedDrops = [existingDrops, currentDrops].filter(d => d && d.trim() !== "").join(";");

          uniqueEntriesMap.set(key, { ...existing, drops: mergedDrops });
        }
      });

      const uniqueEntries = Array.from(uniqueEntriesMap.values());
      totalEntries = uniqueEntries.length;

      // Calculate drops
      uniqueEntries.forEach(row => {
        const drops = parseDrops(row.drops || "");
        drops.forEach(drop => {
          const { amount, name } = parseDropAmount(drop);
          if (!dropsByItem[name]) {
            dropsByItem[name] = { count: 0, totalAmount: 0 };
          }
          dropsByItem[name].count += 1;
          dropsByItem[name].totalAmount += amount;
          totalDrops += 1;
        });
      });

      // Calculate HP used
      const hpEntries = uniqueEntries
        .filter(row => row.hp && row.hp.trim() !== "")
        .map(row => {
          const hpValue = parseInt(row.hp.replace(/,/g, ""), 10);
          return {
            timestamp: row.timestamp,
            hp: isNaN(hpValue) ? null : hpValue,
          };
        })
        .filter(entry => entry.hp !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (hpEntries.length >= 2) {
        const firstHP = hpEntries[0].hp!;
        const lastHP = hpEntries[hpEntries.length - 1].hp!;
        hpUsed = firstHP - lastHP;
      }
    }

    // Create or update weekly stats row
    // Preserve weekKey/weekStart/weekEnd, only update lastUpdated
    const weeklyStatsRow: WeeklyStatsRow = {
      weekKey: preservedWeekKey,
      weekStart: preservedWeekStart,
      weekEnd: preservedWeekEnd,
      totalExp: totalExp.toString(),
      expBySkill: JSON.stringify(expBySkill),
      totalDrops: totalDrops.toString(),
      dropsByItem: JSON.stringify(dropsByItem),
      hpUsed: hpUsed.toString(),
      totalEntries: totalEntries.toString(),
      lastUpdated: new Date().toISOString(), // Update timestamp
    };

    // Update or add the row
    const otherStats = allStats.filter(stat => stat.weekKey !== preservedWeekKey);
    const updatedStats = [...otherStats, weeklyStatsRow].sort((a, b) => b.weekKey.localeCompare(a.weekKey));

    // Save to storage
    const header = getWeeklyStatsHeader();
    const lines = updatedStats.map(weeklyStatsRowToString);
    const csvContent = `${header}\n${lines.join("\n")}`;

    await chrome.storage.local.set({ [WEEKLY_STATS_STORAGE_KEY]: csvContent });
  } catch {
    // Silently handle errors
  }
};

export type { WeeklyStatsRow };
export {
  getWeekKey,
  getWeekDates,
  getWeeklyStatsHeader,
  weeklyStatsRowToString,
  parseWeeklyStatsRow,
  getWeeklyStatsFromStorage,
  getCurrentWeekStats,
  updateWeeklyStats,
  updateWeeklyStatsFromStatsURL,
};
