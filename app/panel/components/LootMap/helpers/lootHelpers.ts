/**
 * Get day suffix (st, nd, rd, th)
 */
export const getDaySuffix = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

/**
 * Format date like "July 4th, 1:32pm"
 */
export const formatHumanDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const daySuffix = getDaySuffix(day);
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${month} ${day}${daySuffix}, ${time}`;
};

/**
 * Format date for day header (e.g., "July 4th, 2024")
 */
export const formatDayHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const daySuffix = getDaySuffix(day);
  const year = date.getFullYear();
  return `${month} ${day}${daySuffix}, ${year}`;
};

/**
 * Format date for week header (e.g., "Week of July 1st, 2024")
 */
export const formatWeekHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  // Get the start of the week (Sunday)
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  const month = weekStart.toLocaleString("en-US", { month: "long" });
  const day = weekStart.getDate();
  const daySuffix = getDaySuffix(day);
  const year = weekStart.getFullYear();
  return `Week of ${month} ${day}${daySuffix}, ${year}`;
};

/**
 * Format date for hour header (e.g., "July 4th, 2024 - 1:00 PM")
 */
export const formatHourHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const daySuffix = getDaySuffix(day);
  const year = date.getFullYear();
  const hour = date.getHours();
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${month} ${day}${daySuffix}, ${year} - ${hour12}:00 ${ampm}`;
};

/**
 * Get start of day for a timestamp
 */
export const getDayStart = (timestamp: string): string => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get start of week for a timestamp (Sunday)
 */
export const getWeekStart = (timestamp: string): string => {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get start of hour for a timestamp
 */
export const getHourStart = (timestamp: string): string => {
  const date = new Date(timestamp);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
};

/**
 * Get start of month for a timestamp
 */
export const getMonthStart = (timestamp: string): string => {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get start of year for a timestamp
 */
export const getYearStart = (timestamp: string): string => {
  const date = new Date(timestamp);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Format date for month header (e.g., "July 2024")
 */
export const formatMonthHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${month} ${date.getFullYear()}`;
};

/**
 * Format date for year header (e.g., "2024")
 */
export const formatYearHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}`;
};

/**
 * Format timestamp for the loot table based on the active time filter.
 * - "hour" filter → "h:mm AM/PM" (e.g. "11:38 AM")
 * - All others → "MMM D" (e.g. "Feb 8")
 */
export const formatTimestamp = (timestamp: string, timeFilter: string): string => {
  const date = new Date(timestamp);
  if (timeFilter === "hour") {
    return date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${month} ${date.getDate()}`;
};

/**
 * Parse a semicolon-separated damageReceived string and return total HP damage.
 * e.g. "5;7;3;8" → 23
 */
export const parseDamageReceived = (damageReceived: string): number => {
  if (!damageReceived) return 0;
  return damageReceived.split(";").reduce((sum, val) => {
    const num = parseInt(val.trim(), 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
};

/**
 * Get the time group key for a timestamp based on the active time filter.
 * Returns the ISO string of the period start, or "" for "none".
 */
export const getTimeGroupKey = (timestamp: string, timeFilter: string): string => {
  switch (timeFilter) {
    case "hour":
      return getHourStart(timestamp);
    case "day":
      return getDayStart(timestamp);
    case "month":
      return getMonthStart(timestamp);
    case "year":
      return getYearStart(timestamp);
    default:
      return "";
  }
};
