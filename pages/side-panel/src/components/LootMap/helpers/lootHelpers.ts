/**
 * Get day suffix (st, nd, rd, th)
 */
export const getDaySuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

/**
 * Format date like "July 4th, 1:32pm"
 */
export const formatHumanDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const daySuffix = getDaySuffix(day);
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${month} ${day}${daySuffix}, ${time}`;
};

/**
 * Format date for day header (e.g., "July 4th, 2024")
 */
export const formatDayHeader = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString('en-US', { month: 'long' });
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
  const month = weekStart.toLocaleString('en-US', { month: 'long' });
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
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const daySuffix = getDaySuffix(day);
  const year = date.getFullYear();
  const hour = date.getHours();
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
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
