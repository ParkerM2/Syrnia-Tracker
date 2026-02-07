import type { TimeFrame } from './types';

/**
 * Format date for chart display based on timeframe
 */
export const formatChartDate = (dateString: string, timeFrame?: TimeFrame): string => {
  const date = new Date(dateString);

  if (!timeFrame) {
    // Default fallback
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  switch (timeFrame) {
    case '6h':
    case '12h':
      // For short timeframes, show hour:minute
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    case '24h':
      // For 24h, show hour
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      });
    case '7d':
      // For 7 days, show day of week and date
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    case '30d':
    case '90d':
      // For 30 days and 90 days, show month and day
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
  }
};

/**
 * Format date for tooltip display
 */
export const formatTooltipDate = (dateString: string, timeFrame?: TimeFrame): string => {
  const date = new Date(dateString);

  if (!timeFrame) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  switch (timeFrame) {
    case '6h':
    case '12h':
      // For short timeframes, show full date and time
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    case '24h':
      // For 24h, show date and time
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    case '7d':
    case '30d':
    case '90d':
      // For longer periods, show full date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    default:
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
  }
};

/**
 * Extract HSL values from color string
 */
export const extractHslValues = (color: string): string => {
  const hslMatch = color.match(/hsl\(([^)]+)\)/);
  return hslMatch ? hslMatch[1] : '221.2 83.2% 53.3%';
};
