/**
 * Formatting utilities for consistent display across the application
 */

/**
 * Formats a number or string as a locale-formatted number string
 * @param exp - Number or string to format
 * @returns Formatted string with locale separators
 */
export const formatExp = (exp: string | number): string => {
  const num = typeof exp === 'string' ? parseInt(exp, 10) : exp;
  if (isNaN(num)) return '0';
  return num.toLocaleString();
};

/**
 * Formats a timestamp to a user-friendly time string
 * Shows only time if from today, otherwise shows date and time
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timestampDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // If the timestamp is from today, show only time
  // Otherwise, show date and time
  if (timestampDate.getTime() === today.getTime()) {
    // Same day - show time only with AM/PM
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } else {
    // Different day - show date and time
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
};

/**
 * Parses a semicolon-separated drops string into an array
 * @param dropsString - Semicolon-separated string of drops
 * @returns Array of drop strings
 */
export const parseDrops = (dropsString: string): string[] => {
  if (!dropsString || dropsString.trim() === '') return [];
  return dropsString
    .split(';')
    .map(drop => drop.trim())
    .filter(drop => drop.length > 0);
};

/**
 * Parses drop amount and name from a drop string
 * Handles patterns like "5 Gold" -> {amount: 5, name: "Gold"}
 * @param dropString - Drop string to parse
 * @returns Object with amount and name
 */
export const parseDropAmount = (dropString: string): { amount: number; name: string } => {
  const match = dropString.match(/^(\d+)\s+(.+)$/);
  if (match) {
    const amount = parseInt(match[1], 10);
    const name = match[2].trim();
    return { amount: isNaN(amount) ? 1 : amount, name };
  }
  return { amount: 1, name: dropString.trim() };
};
